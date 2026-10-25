"""Human review of the project actions proposed from emails.

Every email the reconciliation pipeline records with proposed actions waits in activity_log as
needs_review. A reviewer approves (optionally after editing), or rejects each proposed action, or
closes the email. Approved actions go through the database MCP's own validator and write path
(_validate_project_action, _apply_project_action), so every database rule still applies.

This is deliberately not an MCP tool: an agent must never be able to approve its own proposals.
"""

from datetime import datetime, timezone

import psycopg
from psycopg.types.json import Jsonb

try:
    from ..mcp_servers.mcp_db_server import (
        PROJECT_ENTITY_POLICIES, _apply_project_action, _entity_records_query, _get_conn, _validate_project_action,
    )
except ImportError:  # Supports `uvicorn --app-dir backend`.
    from mcp_servers.mcp_db_server import (
        PROJECT_ENTITY_POLICIES, _apply_project_action, _entity_records_query, _get_conn, _validate_project_action,
    )

ACTION_KEYS = ("operation", "entity", "project_id", "record_id", "changes", "confidence", "evidence", "categories")
REVIEWER_EVIDENCE = "Set by reviewer"


class ReviewError(ValueError):
    """The review request breaks a rule (already decided, missing note, invalid change)."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _load_email(conn, activity_id: str, *, for_update: bool = False) -> dict:
    row = conn.execute(
        "SELECT activity_id, project_id, task_id, activity_type, title, summary, source_path, processing_state, "
        "processing_details, created_at FROM activity_log WHERE activity_id::text = %s AND source_type = 'gmail'"
        + (" FOR UPDATE" if for_update else ""),
        (activity_id,),
    ).fetchone()
    if not row:
        raise LookupError("Email activity not found")
    return row


def _editable_fields(entity: str) -> dict:
    """Field specs the review form needs to edit a proposed change (type, allowed values)."""
    policy = PROJECT_ENTITY_POLICIES.get(entity)
    if not policy:
        return {}
    return {
        name: {key: value for key, value in spec.items() if key != "pydantic_type"}
        for name, spec in policy["fields"].items()
    }


def _current_values(conn, project_id: str, proposal: dict) -> dict | None:
    """Current values of the fields an update would change, so the reviewer sees before -> after."""
    policy = PROJECT_ENTITY_POLICIES.get(proposal.get("entity"))
    if not policy or proposal.get("operation") != "update" or not proposal.get("record_id") or not project_id:
        return None
    record = conn.execute(_entity_records_query(policy, by_id=True), (project_id, proposal["record_id"])).fetchone()
    if not record:
        return None
    return {field: record.get(field) for field in (proposal.get("changes") or {})}


# Rows logged before warnings existed carry one "; "-joined `reason` string instead.
LEGACY_FILLER = "Proposed changes need user review"
LEGACY_DATE_STATUS = {"Reported date is missing": "missing", "Reported date is not supported by email": "unsupported"}


def _legacy_reasons(details: dict) -> list[str]:
    return [part.strip() for part in str(details.get("reason") or "").split(";") if part.strip() and part.strip() != LEGACY_FILLER]


def _email_warnings(details: dict) -> list[str]:
    """Email-level warnings; for legacy rows, the old reason minus the filler and the date status."""
    if "warnings" in details:
        return list(details["warnings"] or [])
    return [reason for reason in _legacy_reasons(details) if reason not in LEGACY_DATE_STATUS]


def _date_status(details: dict) -> str | None:
    """ok / missing / unsupported when a task status change was proposed; None when no date is needed."""
    if "warnings" in details:
        return details.get("date_status")
    for reason in _legacy_reasons(details):
        if reason in LEGACY_DATE_STATUS:
            return LEGACY_DATE_STATUS[reason]
    return "ok" if details.get("reported_date") else None


def get_activity_review(activity_id: str) -> dict:
    """Everything the review page shows except the email body (fetched from Gmail separately)."""
    with _get_conn() as conn:
        row = _load_email(conn, activity_id)
        details = row["processing_details"] or {}
        proposals = [
            {
                **proposal,
                "current": _current_values(conn, row["project_id"], proposal),
                "fields": _editable_fields(proposal.get("entity")),
            }
            for proposal in details.get("proposed_actions") or []
            if isinstance(proposal, dict)
        ]
        # PDF attachments the scanner stored locally for this email (opened via GET /documents/{id}/file).
        documents = conn.execute(
            """SELECT d.document_id::text AS "documentId", s.attachment_name AS filename, d.page_count AS "pageCount",
                      d.status, d.error
            FROM document_source s JOIN document d ON d.document_id = s.document_id
            WHERE s.source_type = 'gmail' AND s.source_ref = %s ORDER BY s.attachment_name""",
            (row["source_path"],),
        ).fetchall()
    return {
        "activityId": str(row["activity_id"]),
        "projectId": row["project_id"],
        "taskId": row["task_id"],
        "messageId": row["source_path"],
        "title": row["title"],
        "summary": row["summary"] or "",
        "categories": details.get("categories") or [c.strip() for c in (row["activity_type"] or "").split(",") if c.strip()],
        "state": row["processing_state"],
        "receivedAt": row["created_at"].isoformat() if row["created_at"] else None,
        "sender": details.get("sender") or "",
        "evidence": details.get("evidence") or "",
        "warnings": _email_warnings(details),
        "note": details.get("note") or "",
        "reportedDate": details.get("reported_date"),
        "dateStatus": _date_status(details),
        "dates": details.get("dates") or [],
        "projectEvidence": details.get("project_evidence") or "",
        "proposals": proposals,
        "documents": documents,
        "review": details.get("review"),
    }


def _reviewed_action(proposal: dict, project_id: str, changes: dict | None, record_id: str | None) -> tuple[dict, bool]:
    """The project action to apply: the proposal, with the reviewer's edits if any."""
    action = {key: proposal[key] for key in ACTION_KEYS if key in proposal}
    action["project_id"] = project_id
    edited = False
    if record_id is not None and record_id.strip() and record_id.strip() != proposal.get("record_id"):
        action["record_id"] = record_id.strip()
        edited = True
    if changes is not None:
        original = proposal.get("changes") or {}
        evidence = proposal.get("evidence") or {}
        action["changes"] = dict(changes)
        # Unchanged values keep the email's evidence; anything the reviewer set is attributed to them.
        action["evidence"] = {
            field: evidence.get(field) if field in original and original[field] == value and evidence.get(field) else REVIEWER_EVIDENCE
            for field, value in changes.items()
        }
        edited = edited or action["changes"] != original
    return action, edited


def _closing_state(proposals: list) -> str:
    if any((proposal.get("review") or {}).get("decision") == "approved" for proposal in proposals):
        return "applied"
    return "rejected" if proposals else "no_change"


def _save(conn, row: dict, details: dict, proposals: list) -> str:
    details["proposed_actions"] = proposals
    undecided = [proposal for proposal in proposals if not proposal.get("review")]
    state = "needs_review" if undecided else _closing_state(proposals)
    conn.execute(
        "UPDATE activity_log SET processing_details = %s, processing_state = %s WHERE activity_id = %s",
        (Jsonb(details), state, row["activity_id"]),
    )
    return state


def decide_action(activity_id: str, index: int, decision: str, *, changes: dict | None = None,
                  record_id: str | None = None, note: str = "", reviewer: str = "reviewer") -> dict:
    """Approve (optionally edited) or reject one proposed action of an email under review.

    Approving applies the action immediately in the same transaction as the review record; a rule
    violation raises ReviewError and nothing changes. The email closes when every action is decided.
    """
    if decision not in {"approve", "reject"}:
        raise ReviewError("Decision must be approve or reject")
    note = (note or "").strip()
    if decision == "reject" and not note:
        raise ReviewError("A note is required to reject a change")
    with _get_conn() as conn:
        with conn.transaction():
            row = _load_email(conn, activity_id, for_update=True)
            if row["processing_state"] != "needs_review":
                raise ReviewError("This email has already been reviewed")
            details = dict(row["processing_details"] or {})
            proposals = list(details.get("proposed_actions") or [])
            if not 0 <= index < len(proposals) or not isinstance(proposals[index], dict):
                raise LookupError("Proposed change not found")
            proposal = proposals[index]
            if proposal.get("review"):
                raise ReviewError("This change has already been decided")

            review = {"decision": "rejected" if decision == "reject" else "approved", "by": reviewer, "at": _now()}
            if note:
                review["note"] = note
            if decision == "approve":
                action, edited = _reviewed_action(proposal, row["project_id"], changes, record_id)
                try:
                    action = _validate_project_action(action, row["project_id"])
                    with conn.transaction():  # Savepoint: a rejected write leaves the review untouched.
                        review["record_id"] = _apply_project_action(conn, action)
                except (ValueError, psycopg.DataError, psycopg.IntegrityError) as exc:
                    raise ReviewError(str(exc)) from exc
                if edited:
                    review["applied_changes"] = action["changes"]
            proposals[index] = {**proposal, "review": review}
            state = _save(conn, row, details, proposals)
    return {"state": state, "index": index, "review": review}


def close_review(activity_id: str, note: str = "", reviewer: str = "reviewer") -> dict:
    """Close an email's review; any undecided changes are rejected with the note."""
    note = (note or "").strip()
    with _get_conn() as conn:
        with conn.transaction():
            row = _load_email(conn, activity_id, for_update=True)
            if row["processing_state"] != "needs_review":
                raise ReviewError("This email has already been reviewed")
            details = dict(row["processing_details"] or {})
            proposals = list(details.get("proposed_actions") or [])
            undecided = [i for i, proposal in enumerate(proposals) if isinstance(proposal, dict) and not proposal.get("review")]
            if undecided and not note:
                raise ReviewError("A note is required to reject the undecided changes")
            for i in undecided:
                proposals[i] = {**proposals[i], "review": {"decision": "rejected", "note": note, "by": reviewer, "at": _now()}}
            details["review"] = {"closed_by": reviewer, "at": _now(), **({"note": note} if note else {})}
            state = _save(conn, row, details, proposals)
    return {"state": state, "rejected": undecided}
