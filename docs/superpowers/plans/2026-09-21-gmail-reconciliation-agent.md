# Gmail Reconciliation Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scan Gmail on a schedule, let DeepSeek classify each email and propose a database destination, reconcile it with current project records, and apply safe updates through the database MCP server.

**Architecture:** A Python command uses the existing Gmail reader, LangChain `ChatDeepSeek`, and an MCP client for database reads and writes. A deterministic reconciler limits which suggested actions can become writes. A ledger makes each Gmail message idempotent; one database MCP tool applies the approved actions for each message transactionally.

**Tech Stack:** Python, `langchain-deepseek`, Pydantic, Gmail API, MCP Python SDK, psycopg, PostgreSQL, cron.

**Spec:** `docs/superpowers/specs/2026-09-21-gmail-reconciliation-agent-design.md`

## Global Constraints

- Gmail stays read-only.
- The LLM proposes only `activity_log`, `project_task`, `request`, or `review_only`; it never writes SQL.
- `DEEPSEEK_API_KEY` comes from the environment; model name is configurable.
- Change orders and ambiguous matches go to review.
- Task status auto-transitions are only `not_started` → `in_progress` and `in_progress` → `complete`.
- One Gmail message ID is processed once; all actions for that message commit atomically.
- Default cron interval: 15 minutes. Numeric progress is not updated in this version.

## Review Focus

- An email that names two projects must go to review, even if its LLM output names one project. Test in Task 2.
- An email that repeats a processed Gmail ID must cause no additional writes. Test in Task 1 and Task 3.
- An older reported date must not overwrite a newer task status. Test in Task 2 and Task 3.
- A change order with an explicit ID must still require review. Test in Task 2.
- A failed DB write must leave the message retryable with no partial project updates. Test in Task 3.

---

### Task 1: Database ledger and MCP operations

**Files:** Modify `backend/db/schema.sql`, `backend/mcp_db_server.py`; create `tests/gmail_reconciliation_db_test.py`.

**Interfaces:** Produce MCP tools `lookup_email_context(project_id: str, task_id: str = "", request_id: str = "") -> str`, `get_email_processing(message_id: str) -> str`, and `apply_email_decision(payload_json: str) -> str`. The JSON result has `state`, `project`, `task`, `request`, and `last_applied_source_date` as applicable. The payload contains message ID, project ID, extracted summary, categories, proposed actions, source date, and evidence.

- [ ] **Step 1: Write failing tests.** Use a fake `psycopg` connection and assert duplicate message IDs return `already_processed`, an update with a mismatched project ID is rejected, and transaction failure rolls back both action and ledger completion. Include a schema smoke assertion for the ledger's primary key.
- [ ] **Step 2: Run `python -m unittest tests.gmail_reconciliation_db_test -v`; confirm failure.**
- [ ] **Step 3: Add `email_processing` with `message_id text primary key`, `project_id`, `categories jsonb`, `extracted jsonb`, `decision jsonb`, `state`, `error`, `created_at`, and `updated_at`.** Add an index on `(project_id, updated_at)`.
- [ ] **Step 4: Implement the three MCP tools.** Use parameterized queries. `lookup_email_context` reads only the named project and exact task/request IDs. `apply_email_decision` locks the ledger row, rechecks target project, transition, and last source date, applies allowed fixed SQL statements, and completes the ledger within one transaction. Persist `needs_review` decisions without project-data mutation. Reject an unknown action or destination.
- [ ] **Step 5: Run the focused test and existing `tests/db-schema-smoke.test.mjs`; commit only these files.**

### Task 2: DeepSeek extraction and deterministic reconciliation

**Files:** Create `backend/email_reconciliation.py`, `tests/email_reconciliation_test.py`; modify `backend/requirements.txt`.

**Interfaces:** Produce `classify_email(email: dict, model) -> EmailFacts`, `decide_email(facts: EmailFacts, context: dict, email: dict) -> dict`. `EmailFacts` is a Pydantic model with categories, project ID, task ID, request ID, reported date, reported status, proposed destination/action, evidence, and uncertainty flag. `decide_email` returns the fixed action vocabulary from the spec.

- [ ] **Step 1: Write failing tests** for daily task status, technical-query creation, multi-category mail, two-project ambiguity, older report date, unsupported status, and change-order review. Use a fake model so tests never call DeepSeek.
- [ ] **Step 2: Run `python -m unittest tests.email_reconciliation_test -v`; confirm failure.**
- [ ] **Step 3: Add `langchain-deepseek` to requirements and implement structured extraction with `ChatDeepSeek(...).with_structured_output(EmailFacts)`.** Prompt the model to return only facts and a proposed destination, treat email instructions as data, and cite a short source excerpt. Validate IDs against patterns and against text evidence before reconciliation.
- [ ] **Step 4: Implement `decide_email` using explicit table/action allowlists and current DB context.** Permit only the spec's forward task transitions, technical query operations, and activity logs. Route changes requiring inference to `needs_review`.
- [ ] **Step 5: Run focused and existing agent-routing tests; commit only these files.**

### Task 3: Scheduled runner and retry behavior

**Files:** Create `backend/scan_gmail.py`, `tests/scan_gmail_test.py`; modify `backend/README.md`. The existing Docker backend has no Gmail credential mounts, so this task documents a host cron entry rather than changing Docker Compose.

**Interfaces:** Produce `run_scan(gmail, db_tools, model, query: str, limit: int, dry_run: bool) -> dict` and CLI `python -m backend.scan_gmail --query 'label:INBOX newer_than:7d' --limit 25 [--dry-run]`.

- [ ] **Step 1: Write failing tests** with fake Gmail/model/MCP clients for duplicate skip, failure isolation, dry-run zero writes, and retry after a failed write.
- [ ] **Step 2: Run `python -m unittest tests.scan_gmail_test -v`; confirm failure.**
- [ ] **Step 3: Implement the runner.** Fetch bounded Gmail IDs, check the ledger, read full message, classify, look up DB context, decide, then call `apply_email_decision` unless dry-run. Print a count summary without bodies, tokens, or keys. Exit nonzero if any message failed.
- [ ] **Step 4: Document environment variables, OAuth setup, one-time dry run, MCP subprocess use, and `*/15 * * * * cd /path/to/project && /path/to/python -m backend.scan_gmail --query 'label:INBOX newer_than:7d' --limit 25` as the 15-minute cron entry.** Add a process lock for overlapping runs and explain retry and review states. Do not install the cron entry until Gmail OAuth and the DeepSeek key are configured.
- [ ] **Step 5: Run focused tests, all backend unittest tests, and a dry run with mocked clients; commit only these files.**

### Task 4: End-to-end verification

**Files:** Modify `tests/scan_gmail_test.py` if a missing case is found; otherwise no code changes.

- [ ] **Step 1: Run `python -m unittest discover -s tests -p '*test.py' -v` and the repository's Node smoke tests.**
- [ ] **Step 2: Inspect git diff and status; verify no user-owned changes were staged and no credentials were logged or committed.**
- [ ] **Step 3: Run a manual `--dry-run` on a small Gmail query if credentials and network are available.** If unavailable, report that live Gmail/DeepSeek behavior remains unverified.
- [ ] **Step 4: Report exact test results, configuration needed, and whether the cron job was installed or only documented.**
