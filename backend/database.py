import os

import psycopg
from psycopg.rows import dict_row


from pathlib import Path

# Load .env from project root
env_file = Path(__file__).resolve().parents[1] / ".env"
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
        left join milestone m on m.phase_id = pp.phase_id
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
        left join project_phase pp on pp.phase_id = m.phase_id
        where m.project_id = %s
        order by m.due_date nulls last, m.milestone_name
        """,
        (project_id,),
    ).fetchall()
    risk_rows = conn.execute(
        """
        select risk_id, risk_code, category, title, likelihood, impact, status,
               mitigation, owner, due_date, affected_milestone, trigger_event,
               reasoning, evidence_source, confidence
        from risk_register
        where project_id = %s
        order by risk_code nulls last, due_date nulls last, title
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
    workforce = conn.execute(
        """
        select wr.worker_type, wr.specification, wr.required_count, 0 as available_count,
               null as task_id, null as task_title, null as discipline, pp.name as phase
        from workforce_requirement wr
        left join project_phase pp on pp.phase_id = wr.phase_id
        where wr.project_id = %s
        order by wr.worker_type
        """,
        (project_id,),
    ).fetchall()
    change_orders = conn.execute(
        """
        select request_id, title, request_type, description, status
        from request
        where project_id = %s and request_type = 'change_order'
        order by request_id
        """,
        (project_id,),
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
        "risks": [
            {
                "id": row["risk_code"] or f"RSK-{index + 1:02d}",
                "title": row["title"],
                "category": row["category"],
                "likelihood": row["likelihood"] or "Possible",
                "impact": row["impact"] or "Medium",
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
            for index, row in enumerate(risk_rows)
        ],
        "activities": [
            {
                "id": f"{project_id}-ACT-{index + 1:02d}",
                "type": _normalize_status(row["activity_type"]),
                "source": "email" if row["source_type"] == "gmail" else row["source_type"],
                "from": (row.get("processing_details") or {}).get("sender") or "",
                "received": row["logged_at"].strftime("%Y-%m-%d %H:%M") if row["logged_at"] else "",
                "relatedTo": row.get("task_id") or project_id,
                "taskId": row.get("task_id"),
                "summary": row["summary"],
                "action": row["title"],
                "details": row.get("processing_details"),
            }
            for index, row in enumerate(activities)
        ],
        "workforce": [
            _workforce_payload(row, project["current_phase"])
            for row in workforce
        ],
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
            for row in change_orders
        ],
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


def _workforce_payload(row, current_phase):
    required = int(row["required_count"] or 0)
    available = int(row["available_count"] or 0)
    need_to_hire = max(0, required - available)
    phase = row["phase"] or current_phase
    phase_type = "current" if phase == current_phase else "future"
    computed_status = "Hire Needed" if need_to_hire > 0 else "Allocated"
    lead_time = "Immediate" if (phase_type == "current" and need_to_hire > 0) else "Planning"
    return {
        "id": row["task_id"] or row["worker_type"],
        "task": row["task_title"] or "Unassigned work package",
        "phase": phase,
        "discipline": row["discipline"] or "General",
        "phaseType": phase_type,
        "workerType": row["worker_type"],
        "spec": row["specification"],
        "required": required,
        "available": available,
        "needToHire": need_to_hire,
        "status": computed_status,
        "leadTime": lead_time,
        "isAdvanceHire": phase_type != "current" and need_to_hire > 0,
        "isImmediateHire": phase_type == "current" and need_to_hire > 0,
    }


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

