"""One bounded Gmail reconciliation pass; intended for cron on Linux."""

import argparse
import asyncio
import json
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

try:
    from .email_reconciliation import classify_email, decide_email
except ImportError:
    from email_reconciliation import classify_email, decide_email

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

    server_file = Path(__file__).parent / "mcp_servers" / "mcp_db_server.py"
    if not server_file.exists():
        server_file = Path(__file__).with_name("mcp_db_server.py")
    params = StdioServerParameters(command=sys.executable, args=[str(server_file)], env=dict(os.environ))
    async with stdio_client(params) as (reader, writer):
        async with ClientSession(reader, writer) as session:
            await session.initialize()
            yield McpDatabase(session)


async def run_scan(gmail, db_tools, model, query: str, limit: int, dry_run: bool) -> dict:
    if not 1 <= limit <= 100:
        raise ValueError("limit must be between 1 and 100")
    counts = {"scanned": 0, "skipped": 0, "updated": 0, "review": 0, "no_change": 0, "failed": 0}

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
            existing = await db_tools.call("get_email_processing", {"message_id": message_id})
            processing_state = existing.get("processing_state")
            if processing_state in {"applied", "needs_review", "no_change"}:
                print(f"  -> Status: Already processed in 'activity_log' (state: {processing_state}) -> SKIPPED", flush=True)
                counts["skipped"] += 1
                continue

            processed += 1
            email = gmail.get_message_detail(message_id)
            subject = email.get("subject", "(No Subject)")
            sender = email.get("from", "Unknown")
            date_hdr = email.get("date", "Unknown")

            print(f"  -> Email Details:", flush=True)
            print(f"       * Subject: {subject}", flush=True)
            print(f"       * From:    {sender}", flush=True)
            print(f"       * Date:    {date_hdr}", flush=True)

            print(f"  -> Categorising email with AI model...", flush=True)
            facts = classify_email(email, model)
            cats_str = ", ".join(facts.categories) if facts.categories else "None"
            print(f"  -> AI Categorisation Result:", flush=True)
            print(f"       * Category:       {cats_str}", flush=True)
            print(f"       * Project ID:     {facts.project_id or '(None)'}", flush=True)
            print(f"       * Task ID:        {facts.task_id or '(None)'}", flush=True)
            print(f"       * Request ID:     {facts.request_id or '(None)'}", flush=True)
            print(f"       * Status:         {facts.reported_status or '(None)'}", flush=True)
            print(f"       * Destination:    {facts.destination}", flush=True)
            print(f"       * Action:         {facts.action}", flush=True)
            print(f"       * Evidence:       \"{facts.evidence}\"", flush=True)
            print(f"       * Summary:        {facts.summary}", flush=True)

            context = await db_tools.call("lookup_email_context", {
                "project_id": facts.project_id,
                "task_id": facts.task_id,
                "request_id": facts.request_id,
            })
            decision = decide_email(facts, context, email)
            dec_state = decision.get("state", "unknown")
            dec_reason = decision.get("reason", "N/A")
            actions = decision.get("actions", [])
            print(f"  -> Decision: {dec_state.upper()} (Reason: {dec_reason})", flush=True)

            if dry_run:
                print(f"  -> [DRY-RUN] No database modifications made.", flush=True)
                continue

            payload = {
                "message_id": message_id,
                "project_id": facts.project_id if context.get("project") else None,
                "task_id": facts.task_id if context.get("task") else None,
                "sender": sender,
                "subject": subject,
                "summary": facts.summary,
                "categories": facts.categories,
                "evidence": facts.evidence,
                "decision": decision,
            }
            applied = await db_tools.call("apply_email_decision", {"payload_json": json.dumps(payload)})
            app_state = applied.get("state")

            print(f"  -> Database Table Updates:", flush=True)
            if app_state == "already_processed":
                counts["skipped"] += 1
                print(f"       - Skipped: Already recorded in table 'activity_log'", flush=True)
            elif app_state == "applied":
                counts["updated"] += 1
                print(f"       [OK] INSERT INTO table 'activity_log' (source_type: gmail, state: applied, activity_id: {applied.get('activity_id', 'new')})", flush=True)
                for act in actions:
                    kind = act.get("kind")
                    if kind == "update_task":
                        print(f"       [OK] UPDATE table 'project_task' [task_id={act.get('task_id')}] -> status='{act.get('status')}'", flush=True)
                    elif kind == "create_request":
                        print(f"       [OK] INSERT INTO table 'request' [request_id={act.get('request_id')}, type={act.get('request_type')}]", flush=True)
                    elif kind == "update_request":
                        print(f"       [OK] UPDATE table 'request' [request_id={act.get('request_id')}] -> status='review'", flush=True)
                    elif kind == "create_activity":
                        print(f"       [OK] (Recorded in table 'activity_log')", flush=True)
            elif app_state == "needs_review":
                counts["review"] += 1
                print(f"       [OK] INSERT INTO table 'activity_log' (flagged for review: {dec_reason})", flush=True)
            else:
                counts["no_change"] += 1
                print(f"       - No project table modifications needed (state: {app_state})", flush=True)
        except Exception as exc:
            counts["failed"] += 1
            print(f"  [ERROR] Processing failed for message {message_id}: {exc}", file=sys.stderr, flush=True)

    print("\n" + "=" * 65, flush=True)
    print(f"[GMAIL SCANNER] Scan completed.", flush=True)
    print(f"Summary: {counts['scanned']} scanned | {counts['updated']} updated | {counts['skipped']} skipped | {counts['review']} needs review | {counts['no_change']} no change | {counts['failed']} failed", flush=True)
    print("=" * 65 + "\n", flush=True)
    return counts


async def _main() -> int:
    try:
        from .gmail_service import GmailService
    except ImportError:
        from gmail_service import GmailService

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
