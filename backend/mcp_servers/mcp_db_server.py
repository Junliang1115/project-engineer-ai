"""
Database Model Context Protocol (MCP) Server for Project Engineer Platform.
Provides tools for AI assistants to safely query and insert project engineering
records (Activity Logs, Requests: Change Orders & Technical Queries) into PostgreSQL.
"""

import json
import os
import re
import sys
from datetime import date, datetime
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from mcp.server.mcpserver import MCPServer
import psycopg
from psycopg.rows import dict_row

server = MCPServer("project-engineer-db")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgrespassword@127.0.0.1:5433/project_engineer",
)


def _get_conn():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row, autocommit=True)


@server.tool()
def insert_activity_log(
    project_id: str,
    activity_type: str,
    title: str,
    summary: str,
    source_type: str = "email",
    source_path: str = "",
    task_id: str = "",
) -> str:
    """
    Inserts a new record into the project's activity_logs table.
    
    Args:
        project_id: Project identifier, e.g. 'PRJ-2401'.
        activity_type: Type of activity, e.g. 'email_received', 'site_inspection', 'drawing_reference', 'technical_query'.
        title: Short title or subject of the activity.
        summary: Concise summary of what happened or key information logged.
        source_type: Origin of the information, e.g. 'Gmail', 'SharePoint'.
        source_path: Reference path or message identifier (e.g. Gmail Message ID, file path, report ID).
        task_id: Optional linked task ID, e.g. 'TSK-103'.
    """
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO activity_log (
                        project_id, task_id, activity_type, title, source_type, source_path, summary
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING activity_id, created_at;
                    """,
                    (
                        project_id,
                        task_id.strip() or None,
                        activity_type.strip(),
                        title.strip(),
                        source_type.strip(),
                        source_path.strip() or None,
                        summary.strip(),
                    ),
                )
                row = cur.fetchone()
                return (
                    f"Activity log successfully inserted:\n"
                    f"  Activity ID : {row['activity_id']}\n"
                    f"  Project ID  : {project_id}\n"
                    f"  Type        : {activity_type}\n"
                    f"  Title       : {title}\n"
                    f"  Source      : {source_type} ({source_path})\n"
                    f"  Summary     : {summary}\n"
                    f"  Logged At   : {row['created_at']}"
                )
    except Exception as exc:
        return f"Error inserting activity log: {exc}"


@server.tool()
def insert_project_request(
    project_id: str,
    request_type: str,
    title: str,
    description: str,
    request_id: str = "",
) -> str:
    """
    Creates and records an official project Request (either a 'change_order' or 'technical_query') in PostgreSQL.
    
    Args:
        project_id: Project identifier, e.g. 'PRJ-2401'.
        request_type: Must be either 'change_order' or 'technical_query'.
        title: Clear title summarizing the request or deviation.
        description: Detailed description of the question, requested change, or problem found.
        request_id: Optional custom ID. If omitted, will auto-generate format: 'TQ-YYYYMMDD-XXXX' or 'CO-YYYYMMDD-XXXX'.
    """
    normalized_type = request_type.strip().lower().replace(" ", "_")
    if normalized_type not in ["change_order", "technical_query"]:
        return (
            f"Error: Invalid request_type '{request_type}'. "
            f"Must be either 'change_order' or 'technical_query'."
        )

    # Generate an ID if not provided
    if not request_id:
        prefix = "CO" if normalized_type == "change_order" else "TQ"
        timestamp = datetime.now().strftime("%Y%m%d-%H%M")
        request_id = f"{prefix}-{timestamp}"

    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO Request (request_id, project_id, title, request_type, description, status)
                    VALUES (%s, %s, %s, %s, %s, 'open')
                    ON CONFLICT (request_id) DO UPDATE
                    SET title = EXCLUDED.title,
                        description = EXCLUDED.description,
                        request_type = EXCLUDED.request_type
                    RETURNING request_id, created_at;
                    """,
                    (
                        request_id.strip(),
                        project_id.strip(),
                        title.strip(),
                        normalized_type,
                        description.strip(),
                    ),
                )
                row = cur.fetchone()
                return (
                    f"Project Request successfully created:\n"
                    f"  Request ID   : {row['request_id']}\n"
                    f"  Project ID   : {project_id}\n"
                    f"  Request Type : {normalized_type}\n"
                    f"  Title        : {title}\n"
                    f"  Status       : open\n"
                    f"  Created At   : {row['created_at']}"
                )
    except Exception as exc:
        return f"Error inserting project request: {exc}"


@server.tool()
def get_project_requests(
    project_id: str = "PRJ-2401",
    request_type: str = "",
    status: str = "",
) -> str:
    """
    List existing requests (change orders / technical queries) for a project.
    
    Args:
        project_id: The target project ID (default: 'PRJ-2401').
        request_type: Optional filter: 'change_order' or 'technical_query'.
        status: Optional filter: 'open', 'review', 'approved', 'closed'.
    """
    query = "SELECT request_id, project_id, title, request_type, description, status, created_at FROM Request WHERE project_id = %s"
    params = [project_id]

    if request_type:
        query += " AND request_type = %s"
        params.append(request_type.strip().lower().replace(" ", "_"))

    if status:
        query += " AND status = %s"
        params.append(status.strip().lower())

    query += " ORDER BY created_at DESC"

    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(query, tuple(params))
                rows = cur.fetchall()
                if not rows:
                    return f"No requests found for project '{project_id}'."
                return json.dumps(
                    [
                        {
                            **row,
                            "created_at": row["created_at"].isoformat()
                            if row["created_at"]
                            else None,
                        }
                        for row in rows
                    ],
                    indent=2,
                )
    except Exception as exc:
        return f"Error fetching project requests: {exc}"


@server.tool()
def get_recent_activity_logs(project_id: str = "PRJ-2401", limit: int = 10) -> str:
    """
    Retrieve recent activity logs for a project.
    
    Args:
        project_id: Target project ID (default: 'PRJ-2401').
        limit: Number of recent logs to fetch (default: 10).
    """
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT activity_id, activity_type, title, source_type, source_path, summary, created_at
                    FROM activity_log
                    WHERE project_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s;
                    """,
                    (project_id, limit),
                )
                rows = cur.fetchall()
                if not rows:
                    return f"No activity logs found for project '{project_id}'."
                return json.dumps(
                    [
                        {
                            **row,
                            "activity_id": str(row["activity_id"]),
                            "created_at": row["created_at"].isoformat()
                            if row["created_at"]
                            else None,
                        }
                        for row in rows
                    ],
                    indent=2,
                )
    except Exception as exc:
        return f"Error fetching activity logs: {exc}"


@server.tool()
def read_only_sql_query(query: str) -> str:
    """
    Execute a safe, read-only SELECT query against the PostgreSQL database.
    Mutations (INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE) are strictly blocked.
    
    Args:
        query: SQL SELECT query string.
    """
    cleaned = query.strip().rstrip(";")

    # Strict safety check: Must start with SELECT or WITH
    if not re.match(r"^\s*(SELECT|WITH)\b", cleaned, re.IGNORECASE):
        return "Security error: Only SELECT queries are permitted in read_only_sql_query."

    # Guard against destructive keywords
    disallowed = [r"\bINSERT\b", r"\bUPDATE\b", r"\bDELETE\b", r"\bDROP\b", r"\bALTER\b", r"\bTRUNCATE\b", r"\bGRANT\b", r"\bREVOKE\b"]
    for pattern in disallowed:
        if re.search(pattern, cleaned, re.IGNORECASE):
            return f"Security error: Query contains forbidden keyword matching {pattern}."

    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                # Enforce transaction read only for database enginer
                cur.execute("SET TRANSACTION READ ONLY;")
                cur.execute(cleaned)
                rows = cur.fetchall()
                if not rows:
                    return "Query returned 0 rows."
                # Convert dates / UUIDs to strings
                formatted = []
                for row in rows:
                    item = {}
                    for k, v in row.items():
                        if isinstance(v, (datetime,)):
                            item[k] = v.isoformat()
                        elif hasattr(v, "__str__") and type(v).__name__ == "UUID":
                            item[k] = str(v)
                        else:
                            item[k] = v
                    formatted.append(item)
                return json.dumps(formatted, indent=2)
    except Exception as exc:
        return f"Database query error: {exc}"


@server.tool()
def get_database_schema() -> str:
    """
    Returns the complete list of database tables and columns with their descriptions.
    Use this to inspect schema relationships before constructing queries or reports.
    """
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT table_name, column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                    ORDER BY table_name, ordinal_position;
                    """
                )
                rows = cur.fetchall()
                tables = {}
                for r in rows:
                    t = r["table_name"]
                    if t not in tables:
                        tables[t] = []
                    tables[t].append(f"{r['column_name']} ({r['data_type']})")
                
                output = ["Database Schema Summary:\n"]
                for t, cols in sorted(tables.items()):
                    output.append(f"Table `{t}`:\n  - " + "\n  - ".join(cols) + "\n")
                return "\n".join(output)
    except Exception as exc:
        return f"Error fetching schema: {exc}"


def _validate_email_actions(actions):
    if not isinstance(actions, list) or len(actions) > 3:
        raise ValueError("Expected at most three email actions")
    allowed = {"create_activity", "update_task", "create_request", "update_request"}
    for action in actions:
        if not isinstance(action, dict) or action.get("kind") not in allowed:
            raise ValueError("Unsupported email action")
        kind = action["kind"]
        if kind == "update_task":
            if action.get("status") not in {"in_progress", "complete"} or not action.get("task_id"):
                raise ValueError("Invalid task update")
            date.fromisoformat(action["reported_date"])
        elif kind == "create_request":
            req_id = action.get("request_id", "")
            req_type = action.get("request_type", "technical_query")
            if not (req_id.startswith("TQ-") or req_id.startswith("CO-")) or not action.get("title") or not action.get("description"):
                raise ValueError("Invalid request action")
            if req_type not in {"technical_query", "change_order"}:
                raise ValueError("Invalid request type")
        elif kind == "update_request":
            if not action.get("request_id", "").startswith("TQ-") or action.get("status") != "review":
                raise ValueError("Invalid technical query status")
    return actions


@server.tool()
def get_email_processing(message_id: str) -> str:
    """Read Gmail scanner state from activity_log by exact Gmail message ID."""
    try:
        with _get_conn() as conn:
            row = conn.execute(
                "SELECT processing_state, processing_details FROM activity_log WHERE source_type = 'gmail' AND source_path = %s",
                (message_id,),
            ).fetchone()
        return json.dumps(row or {"processing_state": "unseen"}, default=str)
    except Exception as exc:
        return json.dumps({"error": str(exc)})


@server.tool()
def lookup_email_context(project_id: str, task_id: str = "", request_id: str = "") -> str:
    """Look up exact project, task, request and latest applied task-source date."""
    try:
        with _get_conn() as conn:
            project = conn.execute("SELECT id, name FROM project WHERE id = %s", (project_id,)).fetchone()
            task = conn.execute("SELECT task_id, project_id, status FROM project_task WHERE task_id = %s AND project_id = %s", (task_id, project_id)).fetchone() if task_id else None
            request = conn.execute("SELECT request_id, project_id, request_type, status FROM request WHERE request_id = %s", (request_id,)).fetchone() if request_id else None
            last_date = None
            if task:
                row = conn.execute(
                    """SELECT max((action->>'reported_date')::date) AS source_date
                    FROM activity_log a
                    CROSS JOIN LATERAL jsonb_array_elements(coalesce(a.processing_details->'actions', '[]'::jsonb)) action
                    WHERE a.project_id = %s AND a.source_type = 'gmail'
                      AND a.processing_state = 'applied' AND action->>'kind' = 'update_task'
                      AND action->>'task_id' = %s""",
                    (project_id, task_id),
                ).fetchone()
                last_date = row["source_date"].isoformat() if row and row["source_date"] else None
        return json.dumps({"project": project, "task": task, "request": request, "last_applied_source_date": last_date}, default=str)
    except Exception as exc:
        return json.dumps({"error": str(exc)})


@server.tool()
def apply_email_decision(payload_json: str) -> str:
    """Atomically record one Gmail decision and apply only supported fixed actions."""
    try:
        payload = json.loads(payload_json)
        message_id = payload["message_id"]
        if not isinstance(message_id, str) or not message_id.strip():
            raise ValueError("message_id is required")
        decision = payload["decision"]
        state = decision["state"]
        if state not in {"applied", "needs_review", "no_change"}:
            raise ValueError("Invalid processing state")
        actions = _validate_email_actions(decision.get("actions", []))
        if state != "applied" and actions:
            raise ValueError("Review or no-change decision cannot write project records")
        project_id = payload.get("project_id") or None
        if actions and not project_id:
            raise ValueError("Project ID required for actions")
        categories = payload.get("categories", [])
        if isinstance(categories, list):
            activity_type = ", ".join(categories) if categories else "others"
        else:
            activity_type = str(categories)
        details = {
            "sender": str(payload.get("sender", "")),
            "categories": categories,
            "evidence": str(payload.get("evidence", ""))[:500],
            "actions": actions,
        }
        with _get_conn() as conn:
            with conn.transaction():
                with conn.cursor() as cur:
                    if project_id:
                        cur.execute("SELECT id FROM project WHERE id = %s", (project_id,))
                        if not cur.fetchone():
                            raise ValueError("Project not found")
                    task_id = payload.get("task_id")
                    if not task_id:
                        for act in actions:
                            if act.get("task_id"):
                                task_id = act["task_id"]
                                break
                    cur.execute(
                        """INSERT INTO activity_log (project_id, task_id, activity_type, title, source_type, source_path, summary, processing_state, processing_details)
                        VALUES (%s, %s, %s, %s, 'gmail', %s, %s, %s, %s::jsonb)
                        ON CONFLICT DO NOTHING RETURNING activity_id""",
                        (project_id, task_id, activity_type, str(payload.get("subject", "Email"))[:200], message_id, str(payload.get("summary", ""))[:1000], state, json.dumps(details)),
                    )
                    row = cur.fetchone()
                    if not row:
                        return json.dumps({"state": "already_processed"})
                    for action in actions:
                        kind = action["kind"]
                        if kind == "create_activity":
                            continue  # The scanner's activity_log row is the activity.
                        if kind == "update_task":
                            cur.execute("SELECT status FROM project_task WHERE task_id = %s AND project_id = %s FOR UPDATE", (action["task_id"], project_id))
                            target = cur.fetchone()
                            if not target or (target["status"], action["status"]) not in {("not_started", "in_progress"), ("in_progress", "complete")}:
                                raise ValueError("Task status changed or transition invalid")
                            cur.execute(
                                """SELECT max((item->>'reported_date')::date) AS source_date FROM activity_log a
                                CROSS JOIN LATERAL jsonb_array_elements(coalesce(a.processing_details->'actions', '[]'::jsonb)) item
                                WHERE a.project_id = %s AND a.source_type = 'gmail' AND a.source_path <> %s
                                  AND a.processing_state = 'applied' AND item->>'kind' = 'update_task' AND item->>'task_id' = %s""",
                                (project_id, message_id, action["task_id"]),
                            )
                            last = cur.fetchone()["source_date"]
                            if last and date.fromisoformat(action["reported_date"]) <= last:
                                raise ValueError("Stale task update")
                            remark = str(payload.get("summary", "")).strip()[:1000]
                            cur.execute(
                                "UPDATE project_task SET status = %s, remark = coalesce(nullif(%s, ''), remark), updated_at = now() WHERE task_id = %s AND project_id = %s",
                                (action["status"], remark, action["task_id"], project_id),
                            )
                        elif kind == "create_request":
                            req_type = action.get("request_type", "technical_query")
                            cur.execute("INSERT INTO request (request_id, project_id, title, request_type, description, status) VALUES (%s, %s, %s, %s, %s, 'open')", (action["request_id"], project_id, action["title"][:200], req_type, action["description"][:2000]))
                        elif kind == "update_request":
                            cur.execute("UPDATE request SET status = 'review' WHERE request_id = %s AND project_id = %s AND request_type = 'technical_query' AND status = 'open' RETURNING request_id", (action["request_id"], project_id))
                            if not cur.fetchone():
                                raise ValueError("Technical query status changed or target missing")
        return json.dumps({"state": state, "activity_id": str(row["activity_id"])})
    except Exception as exc:
        return json.dumps({"error": str(exc)})


if __name__ == "__main__":
    server.run(transport="stdio")
