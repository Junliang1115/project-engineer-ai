import os

import psycopg
from psycopg.rows import dict_row


from pathlib import Path

# Load .env from project root
env_file = Path(__file__).resolve().parents[2] / ".env"
if env_file.exists():
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

DATABASE_URL = os.getenv("DATABASE_URL")


def _connect():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set. Please check your .env or container environment.")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def _normalize_status(status):
    return (status or "").replace("_", " ").title()


def _expenditure_payload(row):
    estimate = _millions(row["estimated_amount"])
    actual = _millions(row["actual_amount"])
    return {
        "id": str(row["expenditure_id"]),
        "phase": row["phase"],
        "title": row["title"],
        "category": row["category"],
        "vendor": row["vendor"] or "",
        "estimate": estimate,
        "actual": actual,
        "variance": round(estimate - actual, 1),
        "status": _normalize_status(row["status"]),
        "expenditureDate": row["expenditure_date"].isoformat() if row["expenditure_date"] else "",
        "milestoneId": str(row["milestone_id"]) if row.get("milestone_id") else None,
        "taskId": row.get("task_id"),
    }


def _file_size(size_bytes):
    if not size_bytes:
        return ""
    if size_bytes < 1024 * 1024:
        return f"{max(1, round(size_bytes / 1024))} KB"
    return f"{size_bytes / (1024 * 1024):.1f} MB"


def _request_payload(row, document=None):
    payload = {
        "id": row["request_id"],
        "category": _normalize_status(row["request_type"]),
        "title": row["title"],
        "description": row["description"],
        "status": _normalize_status(row["status"]),
        "createdAt": row["created_at"].isoformat() if row["created_at"] else "",
    }
    if document:
        # The stored PDF from the email that raised the request; the page loads it from GET /documents/{id}/file.
        payload.update({
            "documentId": str(document["document_id"]),
            "attachmentName": document["filename"],
            "attachmentSize": _file_size(document["size_bytes"]),
            "attachmentPages": document["page_count"],
            "attachmentStatus": document["status"],
            "submittedBy": document["sender"] or "",
        })
    return payload


def _request_documents(conn, project_id):
    """The original PDF of each request: an attachment of the email that proposed the request.

    Emails that create a request (or update it, for follow-ups) carry its ID in their proposed
    actions; their PDF attachments are in document_source (gmail, message id). The email that
    created the request wins, then the earliest one. Returns {request_id: document row}.
    """
    if not conn.execute("select to_regclass('public.document') as name").fetchone()["name"]:
        return {}  # Older database without the document tables (python backend/db/rebuild.py).
    rows = conn.execute(
        """
        select distinct on (r.request_id)
               r.request_id, d.document_id, s.attachment_name as filename, d.size_bytes, d.page_count, d.status,
               a.processing_details->>'sender' as sender
        from activity_log a
        cross join lateral jsonb_array_elements(coalesce(a.processing_details->'proposed_actions', '[]'::jsonb)) p
        cross join lateral (select coalesce(p->'changes'->>'request_id', p->>'record_id') as request_id) r
        join document_source s on s.source_type = 'gmail' and s.source_ref = a.source_path
        join document d on d.document_id = s.document_id
        where a.project_id = %s and a.source_type = 'gmail' and p->>'entity' = 'request' and r.request_id is not null
        order by r.request_id, (p->>'operation' = 'create') desc, a.created_at, s.attachment_name
        """,
        (project_id,),
    ).fetchall()
    return {row["request_id"]: row for row in rows}


def _lesson_payload(row):
    return {
        "id": row.get("lesson_id") or "LL-000",
        "lessonId": row.get("lesson_id"),
        "projectId": row["project_id"],
        "project": row.get("project_name") or row["project_id"],
        "phase": row.get("phase_name") or row.get("current_phase") or "Construction",
        "category": row["knowledge_area"],
        "event": row["title"],
        "rootCause": row["root_cause"],
        "lesson": row["description"] or row["title"],
        "action": row["business"] or "Mitigate discrepancy according to standard operating procedure.",
    }


def _risk_payload(row):
    return {
        "id": row["risk_id"],
        "title": row["title"],
        "category": row["category"],
        "likelihood": row["likelihood"] or "Possible",
        "impact": row["impact"] or "Medium",
        "affectedAreas": list(row.get("affected_areas") or []),
        "priority": _normalize_status(row.get("priority") or "medium"),
        "owner": row["owner"] or "Unassigned",
        "mitigation": row["mitigation"] or "",
        "due": row["due_date"].strftime("%d %b") if row["due_date"] else "",
        "dueDate": row["due_date"].isoformat() if row["due_date"] else "",
        "affected": row["affected_milestone"] or "General milestone",
        "trigger": row["trigger_event"] or "Operational indicator threshold reached",
        "reasoning": row["reasoning"] or row["title"],
        "evidence": row["evidence_source"] or "Project documentation & review",
        "confidence": row["confidence"] or "Medium",
        "status": _normalize_status(row["status"]),
    }


def _activity_payload(row, project_id, index):
    state = (row.get("processing_state") or "needs_review").lower()
    status = {"applied": "Done", "no_change": "Done", "done": "Done", "rejected": "Rejected"}.get(state, "Needs review")
    return {
        "id": f"{project_id}-ACT-{index + 1:02d}",
        "activityId": str(row["activity_id"]),
        "reviewable": row["source_type"] == "gmail",
        "proposalCount": len((row.get("processing_details") or {}).get("proposed_actions") or []),
        "type": _normalize_status(row["activity_type"]),
        "source": "Email" if row["source_type"] in {"gmail", "email"} else _normalize_status(row["source_type"]),
        "received": row["logged_at"].strftime("%Y-%m-%d %H:%M") if row["logged_at"] else "",
        "relatedTo": row.get("task_id") or project_id,
        "taskId": row.get("task_id"),
        "summary": row["summary"],
        "title": row["title"],
        "status": status,
    }


def list_projects_from_db():
    with _connect() as conn:
        projects = conn.execute(
            """
            select id, name, current_phase, progress_percent, budget_amount, spent_amount
            from project
            order by created_at desc
            """
        ).fetchall()

        return [_project_payload(conn, project) for project in projects]


def get_project_from_db(project_id: str):
    with _connect() as conn:
        project = conn.execute(
            """
            select id, name, current_phase, progress_percent, budget_amount, spent_amount
            from project
            where id = %s or (id = 'PRJ-2401' and %s in ('PRJ-01', 'PRJ-2401'))
            limit 1
            """,
            (project_id, project_id),
        ).fetchone()
        if not project:
            return None
        return _project_payload(conn, project)


def _project_payload(conn, project):
    project_id = project["id"]
    tasks = conn.execute(
        """
        select task_id as id, milestone_id, task_name as title, discipline, owner, status, priority,
               planned_end_date as due_date, cost_estimate, cost_actual, remark
        from project_task
        where project_id = %s
        order by planned_end_date nulls last, task_id
        """,
        (project_id,),
    ).fetchall()
    costs = conn.execute(
        """
        select pp.name as phase, coalesce(sum(m.planned_amount), 0) as estimate, coalesce(sum(m.actual_amount), 0) as actual
        from project_phase pp
        left join milestone m on m.project_id = pp.project_id and m.phase_id = pp.phase_id
        where pp.project_id = %s
        group by pp.phase_order, pp.name
        order by pp.phase_order
        """,
        (project_id,),
    ).fetchall()
    milestones = conn.execute(
        """
        select m.milestone_id, m.milestone_name, m.status, m.progress_percent, m.due_date,
               m.planned_amount, m.actual_amount, pp.name as phase_name
        from milestone m
        left join project_phase pp on pp.project_id = m.project_id and pp.phase_id = m.phase_id
        where m.project_id = %s
        order by m.due_date nulls last, m.milestone_name
        """,
        (project_id,),
    ).fetchall()
    risk_rows = conn.execute(
        """
        select risk_id, category, title, likelihood, impact, affected_areas, priority, status,
               mitigation, owner, due_date, affected_milestone, trigger_event,
               reasoning, evidence_source, confidence
        from risk_register
        where project_id = %s
        order by substring(risk_id from '[0-9]+$')::integer, due_date nulls last, title
        """,
        (project_id,),
    ).fetchall()
    activities = conn.execute(
        """
        select activity_id, task_id, activity_type, title, source_type, source_path as source_ref,
               summary, processing_state, processing_details, created_at as logged_at
        from activity_log
        where project_id = %s
        order by created_at desc
        """,
        (project_id,),
    ).fetchall()
    requests = conn.execute(
        """
        select request_id, title, request_type, description, status, created_at
        from request
        where project_id = %s
        order by created_at desc, request_id
        """,
        (project_id,),
    ).fetchall()
    request_documents = _request_documents(conn, project_id)
    expenditures = conn.execute(
        """
        select e.expenditure_id, pp.name as phase, e.title, e.category, e.vendor,
               e.estimated_amount, e.actual_amount, e.status, e.expenditure_date,
               e.milestone_id, e.task_id
        from expenditure e
        join project_phase pp on pp.project_id = e.project_id and pp.phase_id = e.phase_id
        where e.project_id = %s
        order by e.expenditure_date nulls last, e.created_at, e.expenditure_id
        """,
        (project_id,),
    ).fetchall()
    lesson_rows = conn.execute(
        """
        select l.lesson_id, l.project_id, l.title, l.knowledge_area,
               l.root_cause, l.description, l.business,
               p.name as project_name, p.current_phase,
               pp.name as phase_name
        from lesson l
        join project p on p.id = l.project_id
        left join project_phase pp on pp.project_id = l.project_id and pp.phase_id = l.phase_id
        where l.project_id = %s or (%s in ('PRJ-01', 'PRJ-2401') and l.project_id in ('PRJ-01', 'PRJ-2401'))
        order by l.lesson_id
        """,
        (project_id, project_id),
    ).fetchall()

    tasks_payload = [
        {
            "id": row["id"],
            "title": row["title"],
            "phase": project["current_phase"],
            "discipline": row["discipline"] or _discipline_from_task(row["title"]),
            "status": _normalize_status(row["status"]),
            "owner": row["owner"] or "Unassigned",
            "due_date": row["due_date"].isoformat() if row["due_date"] else "",
            "cost_estimate": float(row["cost_estimate"] or 0),
            "cost_actual": float(row["cost_actual"] or 0),
            "milestone_id": str(row["milestone_id"]) if row.get("milestone_id") else None,
            "remark": row.get("remark") or "",
            "activities": [
                {
                    "id": str(act["activity_id"]),
                    "type": _normalize_status(act["activity_type"]),
                    "sourceType": act["source_type"] or "",
                    "from": (act.get("processing_details") or {}).get("sender") or "",
                    "received": act["logged_at"].strftime("%Y-%m-%d %H:%M") if act["logged_at"] else "",
                    "title": act["title"],
                    "summary": act["summary"],
                    "state": act.get("processing_state"),
                    "evidence": (act.get("processing_details") or {}).get("evidence") or "",
                    "details": act.get("processing_details"),
                }
                for act in activities
                if act.get("task_id") == row["id"]
            ],
        }
        for row in tasks
    ]

    milestones_payload = [
        {
            "id": row["milestone_name"].split(" ")[0] if " " in row["milestone_name"] else f"M-{index + 1:02d}",
            "name": row["milestone_name"].split(" ", 1)[1] if " " in row["milestone_name"] and row["milestone_name"].startswith("M-") else row["milestone_name"],
            "phase": row["phase_name"] or project["current_phase"],
            "status": _normalize_status(row["status"]),
            "progress": round(float(row["progress_percent"] or 0)),
            "forecastDate": row["due_date"].isoformat() if row["due_date"] else "",
            "plannedAmount": _millions(row["planned_amount"]),
            "actualAmount": _millions(row["actual_amount"]),
            "tasks": [
                t for t in tasks_payload
                if t.get("milestone_id") and t["milestone_id"] == str(row["milestone_id"])
            ],
        }
        for index, row in enumerate(milestones)
    ]

    return {
        "id": project_id,
        "name": project["name"],
        "phase": project["current_phase"],
        "budget": _millions(project["budget_amount"]),
        "progress": round(float(project["progress_percent"] or 0)),
        "costs": [
            {
                "phase": row["phase"],
                "estimate": _millions(row["estimate"]),
                "actual": _millions(row["actual"]),
            }
            for row in costs
        ],
        "expenditures": [_expenditure_payload(row) for row in expenditures],
        "milestones": milestones_payload,
        "tasks": tasks_payload,
        "issues": [
            {
                "id": f"RISK-{index + 1:02d}",
                "description": row["title"],
                "related_task_id": tasks[0]["id"] if tasks else "N/A",
                "severity": "High" if row["impact"] == "high" else "Medium",
                "status": _normalize_status(row["status"]),
            }
            for index, row in enumerate(risk_rows)
        ],
        "risks": [_risk_payload(row) for row in risk_rows],
        "activities": [_activity_payload(row, project_id, index) for index, row in enumerate(activities)],
        "requests": [_request_payload(row, request_documents.get(row["request_id"])) for row in requests],
        "changeOrders": [
            {
                "id": row["request_id"],
                "requestType": _normalize_status(row["request_type"]),
                "title": row["title"],
                "requestedChange": row["description"],
                "technicalAgentResult": "Needs review",
                "complianceAgentResult": "Pending",
                "standardId": "Request table",
                "determination": "requires-review",
                "recommendedResponse": "Review request details and route to the responsible engineer.",
                "followUpAction": "Attach supporting evidence before project engineer validation.",
                "responsibleEngineer": "Project engineer",
                "status": _normalize_status(row["status"]),
            }
            for row in requests
            if row["request_type"] == "change_order"
        ],
        "lessons": [_lesson_payload(row) for row in lesson_rows],
    }


def _millions(value):
    return round(float(value or 0) / 1_000_000, 1)


def _discipline_from_task(title):
    title = title.lower()
    if "pump" in title or "hvac" in title or "pipe" in title:
        return "MEP Services"
    if "fire" in title:
        return "Life Safety"
    return "Project Controls"


def list_project_phases(project_id: str):
    with _connect() as conn:
        rows = conn.execute(
            """
            select phase_id as id, project_id, name, phase_order, status, progress_percent
            from project_phase
            where project_id = %s
            order by phase_order asc
            """,
            (project_id,),
        ).fetchall()
        return [
            {
                "id": str(r["id"]),
                "project_id": r["project_id"],
                "name": r["name"],
                "phase_order": r["phase_order"],
                "status": r["status"],
                "progress_percent": float(r["progress_percent"] or 0),
            }
            for r in rows
        ]


def update_project_phase(project_id: str, phase_id: str, new_status: str, progress_percent: float | None = None):
    with _connect() as conn:
        with conn.cursor() as cur:
            # 1. Update the phase status and optional progress
            if progress_percent is not None:
                cur.execute(
                    """
                    update project_phase
                    set status = %s, progress_percent = %s
                    where phase_id = %s and project_id = %s
                    returning phase_id as id, project_id, name, phase_order, status, progress_percent
                    """,
                    (new_status, progress_percent, phase_id, project_id),
                )
            else:
                cur.execute(
                    """
                    update project_phase
                    set status = %s
                    where phase_id = %s and project_id = %s
                    returning phase_id as id, project_id, name, phase_order, status, progress_percent
                    """,
                    (new_status, phase_id, project_id),
                )
            phase = cur.fetchone()
            if not phase:
                return None

            # 2. If status is set to 'active', sync project.current_phase
            if new_status == "active":
                cur.execute(
                    """
                    update project
                    set current_phase = %s
                    where id = %s
                    """,
                    (phase["name"], project_id),
                )

            cur.execute("select current_phase from project where id = %s", (project_id,))
            proj = cur.fetchone()
            current_project_phase = proj["current_phase"] if proj else None

        conn.commit()

        return {
            "id": str(phase["id"]),
            "project_id": phase["project_id"],
            "name": phase["name"],
            "phase_order": phase["phase_order"],
            "status": phase["status"],
            "progress_percent": float(phase["progress_percent"] or 0),
            "current_project_phase": current_project_phase,
        }

def get_last_updated_at():
    with _connect() as conn:
        row = conn.execute(
            """
            select max(created_at) as last_updated from activity_log
            """
        ).fetchone()
        if row and row.get("last_updated"):
            return row["last_updated"].isoformat()
        return None


def list_lessons_from_db(project_id: str | None = None):
    with _connect() as conn:
        if project_id:
            rows = conn.execute(
                """
                select l.lesson_id, l.project_id, l.title, l.knowledge_area,
                       l.root_cause, l.description, l.business,
                       p.name as project_name, p.current_phase,
                       pp.name as phase_name
                from lesson l
                join project p on p.id = l.project_id
                left join project_phase pp on pp.project_id = l.project_id and pp.phase_id = l.phase_id
                where l.project_id = %s or (%s in ('PRJ-01', 'PRJ-2401') and l.project_id in ('PRJ-01', 'PRJ-2401'))
                order by l.lesson_id
                """,
                (project_id, project_id),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                select l.lesson_id, l.project_id, l.title, l.knowledge_area,
                       l.root_cause, l.description, l.business,
                       p.name as project_name, p.current_phase,
                       pp.name as phase_name
                from lesson l
                join project p on p.id = l.project_id
                left join project_phase pp on pp.project_id = l.project_id and pp.phase_id = l.phase_id
                order by l.lesson_id
                """
            ).fetchall()
        return [_lesson_payload(row) for row in rows]

