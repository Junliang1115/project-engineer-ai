"""One bounded Gmail reconciliation pass; intended for cron on Linux."""

import argparse
import asyncio
import json
import os
import sys
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4

# Add backend directory to sys.path so the CLI runs as a script
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

try:
    from .email_reconciliation import classify_email, ground_email, identify_project
except ImportError:
    from reconciliation.email_reconciliation import classify_email, ground_email, identify_project

# Database 
class McpDatabase:
    def __init__(self, session):
        self.session = session

    async def call(self, name: str, args: dict) -> dict:
        result = await self.session.call_tool(name, args)
        if getattr(result, "is_error", False):
            raise RuntimeError(f"Database MCP tool failed: {name}")
        blocks = [item.text for item in result.content if item.type == "text"]
        if not blocks:
            raise RuntimeError(f"Database MCP tool returned no text: {name}")
        data = json.loads(blocks[0])
        if "error" in data:
            raise RuntimeError(f"Database MCP {name}: {data['error']}")
        return data

# Call Database MCP
@asynccontextmanager
async def database_tools():
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client

    server_file = Path(__file__).resolve().parents[1] / "mcp_servers" / "mcp_db_server.py"
    params = StdioServerParameters(command=sys.executable, args=[str(server_file)], env=dict(os.environ))
    async with stdio_client(params) as (reader, writer):
        async with ClientSession(reader, writer) as session:
            await session.initialize()
            yield McpDatabase(session)


def _print_extraction(extraction) -> None:
    cats_str = ", ".join(extraction.categories) if extraction.categories else "None"
    print(f"  -> AI Extraction Result:", flush=True)
    print(f"       * Category:       {cats_str}", flush=True)
    print(f"       * Project ID:     {extraction.project_id or '(None)'}", flush=True)
    print(f"       * Reported date:  {extraction.reported_date or '(missing)'}", flush=True)
    for entry in extraction.dates:
        print(f"       * Date ({entry.kind}): {entry.date} \"{entry.evidence}\"", flush=True)
    print(f"       * Summary:        {extraction.summary}", flush=True)
    for action in extraction.actions or []:
        changes = {change.field: change.value for change in action.changes}
        target = f" {action.record_id}" if action.record_id else ""
        print(f"       * Proposed:       {action.operation} {action.entity}{target} {changes} "
              f"[{action.confidence}] \"{action.evidence}\"", flush=True)


def _print_recorded(recorded: dict) -> None:
    state = recorded.get("state")
    if state == "already_processed":
        print(f"  -> Skipped: already recorded in 'activity_log'", flush=True)
        return
    print(f"  -> Recorded in 'activity_log' as {str(state).upper()} (activity_id: {recorded.get('activity_id', 'preview')})", flush=True)
    for act in recorded.get("proposed_actions", []):
        target = f" {act['record_id']}" if act.get("record_id") else ""
        warnings = f" [warning: {'; '.join(act['warnings'])}]" if act.get("warnings") else ""
        print(f"       * Awaiting review: {act.get('operation')} {act.get('entity')}{target} {act.get('changes')} "
              f"[check: {act.get('check')}]{warnings}", flush=True)


async def _project_records(db_tools, project_id: str, entity: str = "") -> dict | None:
    """The database MCP's get_project_records result, or None when the read was rejected."""
    records = await db_tools.call("get_project_records", {"project_id": project_id, "entity": entity})
    return records if records.get("status") == "ok" else None


def _project_row(records: dict | None) -> dict | None:
    """The project row from a get_project_records result (None when the project does not exist)."""
    rows = records["entities"]["project"]["records"] if records else []
    return rows[0] if rows else None


# record_email_decision state -> run_scan counter
_OUTCOMES = {"already_processed": "skipped", "needs_review": "review", "no_change": "no_change"}


async def reconcile_email(email: dict, db_tools, model, dry_run: bool = False) -> dict:
    """Extract project actions from one email and record them for user review through the database MCP.

    Emails never change project records directly: the database MCP checks each proposed action
    against its rules and stores it in the activity log for review. `email` needs subject/body/date,
    plus `id` (the Gmail message ID) when recording. With dry_run nothing is written.
    Returns {"outcome", "extraction", "decision", "recorded"}; outcome is one of
    review, no_change, skipped or dry_run.
    """
    entity_schema = await db_tools.call("get_project_entity_schema", {})
    # Step 1: the model identifies the project (by ID, name, reference or context) from the project list.
    projects = (await db_tools.call("list_projects", {})).get("projects", [])
    print(f"  -> Identifying the project with AI model...", flush=True)
    match = identify_project(email, projects, model)
    print(f"       * Project: {match.project_id or '(none)'} [{match.confidence}] \"{match.evidence}\"", flush=True)
    # Step 2: read the email with that project's current records, so the model can match names to IDs.
    records = await _project_records(db_tools, match.project_id) if match.project_id else None
    print(f"  -> Extracting project actions with AI model...", flush=True)
    extraction = classify_email(email, model, entity_schema, records, match)
    _print_extraction(extraction)
    project = _project_row(records)
    decision = ground_email(extraction, email, project, records)
    print(f"  -> Decision: {decision.get('state', 'unknown').upper()} "
          f"(Warnings: {'; '.join(decision.get('warnings') or []) or 'none'})", flush=True)
    result = {"extraction": extraction.model_dump(mode="json"), "decision": decision}

    payload = {
        "message_id": email.get("id") or f"preview-{uuid4().hex}",
        "project_id": extraction.project_id if project else None,
        "sender": email.get("from", "Unknown"),
        "subject": email.get("subject", "(No Subject)"),
        "summary": extraction.summary,
        "categories": extraction.categories,
        "evidence": "; ".join(action.evidence for action in extraction.actions),
        "decision": decision,
    }
    recorded = await db_tools.call("record_email_decision", {"payload_json": json.dumps(payload), "dry_run": dry_run})
    _print_recorded(recorded)
    stored = [document["document_id"] for document in email.get("documents") or [] if document.get("document_id")]
    if stored and project and not dry_run:
        _assign_project(stored, extraction.project_id)
    if dry_run:
        print(f"  -> [DRY-RUN] nothing was written.", flush=True)
        return {**result, "outcome": "dry_run", "recorded": recorded}
    return {**result, "outcome": _OUTCOMES.get(recorded.get("state"), "no_change"), "recorded": recorded}


def _attachment_documents(email: dict, gmail, dry_run: bool) -> list[dict]:
    """Save each PDF attachment locally first, then parse it, for the model to read.

    Returns [{document_id, filename, status, page_count, pages, error}]. With dry_run the PDF is
    parsed from a temporary file and nothing is stored. A bad attachment never stops the email.
    """
    try:
        from ..documents.document_store import get_document, is_pdf, store_and_ingest
        from ..documents.pdf_extractor import extract_pdf
    except ImportError:
        from documents.document_store import get_document, is_pdf, store_and_ingest
        from documents.pdf_extractor import extract_pdf

    documents = []
    for attachment in email.get("attachments") or []:
        filename = attachment.get("filename") or "attachment.pdf"
        if not attachment.get("attachment_id") or not is_pdf(filename, attachment.get("mime_type", "")):
            continue
        try:
            data = gmail.get_attachment_bytes(email["id"], attachment["attachment_id"])
            if dry_run:
                with tempfile.TemporaryDirectory() as folder:
                    path = Path(folder) / "preview.pdf"
                    path.write_bytes(data)
                    extracted = extract_pdf(path)
                documents.append({"filename": filename, "status": "preview", "page_count": extracted["page_count"],
                                  "pages": extracted["pages"]})
                continue
            row = store_and_ingest(data, filename=filename, source_type="gmail", source_ref=email["id"],
                                   attachment_name=filename)
            pages = [
                {"page": page["page_number"], "text": page["text"], "tables": page["tables"], "has_text": page["has_text"]}
                for page in get_document(row["document_id"])["pages"]
            ]
            documents.append({"document_id": str(row["document_id"]), "filename": filename, "status": row["status"],
                              "page_count": row["page_count"], "pages": pages, "error": row["error"]})
        except Exception as exc:
            print(f"  [WARN] Attachment {filename} could not be stored or parsed: {exc}", file=sys.stderr, flush=True)
            documents.append({"filename": filename, "status": "failed", "error": str(exc)[:300], "pages": []})
    for document in documents:
        print(f"  -> Attachment: {document['filename']} [{document['status']}, {document.get('page_count') or 0} pages]", flush=True)
    return documents


def _assign_project(document_ids: list[str], project_id: str) -> None:
    """Attach stored attachments to the email's project once it is known (keeps an existing project)."""
    try:
        from ..documents.document_store import assign_project
    except ImportError:
        from documents.document_store import assign_project
    try:
        assign_project(document_ids, project_id)
    except Exception as exc:
        print(f"  [WARN] Could not link attachments to {project_id}: {exc}", file=sys.stderr, flush=True)


async def reconcile_message(message_id: str, gmail, db_tools, model, dry_run: bool = False) -> dict:
    """Reconcile one Gmail message by ID, skipping messages already recorded in activity_log."""
    existing = await db_tools.call("get_email_processing", {"message_id": message_id})
    processing_state = existing.get("processing_state")
    if processing_state and processing_state != "unseen":  # Any logged state, including reviewed ones.
        print(f"  -> Status: Already processed in 'activity_log' (state: {processing_state}) -> SKIPPED", flush=True)
        return {"message_id": message_id, "outcome": "skipped", "extraction": None, "decision": None, "recorded": None}

    email = gmail.get_message_detail(message_id)
    email.setdefault("id", message_id)
    email["documents"] = _attachment_documents(email, gmail, dry_run)
    print(f"  -> Email Details:", flush=True)
    print(f"       * Subject: {email.get('subject', '(No Subject)')}", flush=True)
    print(f"       * From:    {email.get('from', 'Unknown')}", flush=True)
    print(f"       * Date:    {email.get('date', 'Unknown')}", flush=True)
    return {"message_id": message_id, **await reconcile_email(email, db_tools, model, dry_run)}


async def run_scan(gmail, db_tools, model, query: str, limit: int, dry_run: bool) -> dict:
    if not 1 <= limit <= 100:
        raise ValueError("limit must be between 1 and 100")
    counts = {"scanned": 0, "skipped": 0, "review": 0, "no_change": 0, "failed": 0}

    print("\n" + "=" * 65, flush=True)
    print(f"[GMAIL SCANNER] Starting scan...", flush=True)
    print(f"[GMAIL SCANNER] Query:   {query}", flush=True)
    print(f"[GMAIL SCANNER] Limit:   {limit} message(s)", flush=True)
    print(f"[GMAIL SCANNER] Dry-run: {dry_run}", flush=True)
    print("=" * 65, flush=True)

    refs = gmail.iter_message_refs(query=query) if hasattr(gmail, "iter_message_refs") else gmail.list_messages(query=query, max_results=limit)
    processed = 0
    for ref in refs:
        if processed >= limit:
            break
        counts["scanned"] += 1
        message_id = ref["id"]
        print(f"\n--- [Message #{counts['scanned']}] ID: {message_id} ---", flush=True)
        try:
            result = await reconcile_message(message_id, gmail, db_tools, model, dry_run)
        except Exception as exc:
            processed += 1
            counts["failed"] += 1
            print(f"  [ERROR] Processing failed for message {message_id}: {exc}", file=sys.stderr, flush=True)
            continue
        # Messages skipped by the dedup guard don't count towards the limit.
        if result["recorded"] is not None or result["outcome"] != "skipped":
            processed += 1
        outcome = result["outcome"]
        if outcome == "dry_run":  # Count the previewed outcome so a dry-run summary shows what would happen.
            outcome = _OUTCOMES.get((result["recorded"] or {}).get("state"), "no_change")
        if outcome in counts:
            counts[outcome] += 1

    print("\n" + "=" * 65, flush=True)
    print(f"[GMAIL SCANNER] Scan completed.", flush=True)
    print(f"{'Dry-run preview (nothing written): ' if dry_run else 'Summary: '}{counts['scanned']} scanned | {counts['skipped']} skipped | {counts['review']} needs review | {counts['no_change']} no change | {counts['failed']} failed", flush=True)
    print("=" * 65 + "\n", flush=True)
    return counts


async def _main() -> int:
    try:
        from ..integrations.gmail_service import GmailService
    except ImportError:
        from integrations.gmail_service import GmailService

    parser = argparse.ArgumentParser(description="Scan Gmail and reconcile project records")
    parser.add_argument("--query", default="label:INBOX newer_than:7d")
    parser.add_argument("--limit", type=int, default=25)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    async with database_tools() as db:
        counts = await run_scan(GmailService(), db, None, args.query, args.limit, args.dry_run)
    print(json.dumps(counts))
    return 1 if counts["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_main()))
