# Scheduled Gmail reconciliation agent

## Goal

Automatically scan project emails, classify their content, compare extracted facts with PostgreSQL records through the database MCP server, and apply clear updates without requiring a chat prompt. Keep ambiguous matches and change orders for review.

## Existing system

`backend/gmail_service.py` reads Gmail messages with the Gmail read-only scope. `backend/mcp_gmail_server.py` exposes search and message-read tools. `backend/mcp_db_server.py` exposes project requests, activity logs, and read-only SQL, but lacks task and request-status update tools. `backend/agents.py` currently routes chat prompts by keywords and uses in-memory project data; this scheduled flow will be independent of chat runs.

## Pipeline

1. A cron-triggered Python command scans a bounded Gmail query for recent project messages. Gmail message IDs are the processing keys.
2. For each unseen message, LangChain's `ChatDeepSeek` reads the subject and plain-text body and returns a validated structured result: one or more of `daily_update`, `technical_query`, `change_order`, or `other`; project identifier; any explicit task/request identifier; reported date and status; concise evidence; uncertainty flag; and proposed destination and action. The destination is limited to `activity_log`, `project_task`, `request`, or `review_only`; the action is limited to `create`, `update`, `no_change`, or `review`. `DEEPSEEK_API_KEY` comes from the environment. The model name is configurable, with a current supported DeepSeek model as the default.
3. The pipeline validates extracted identifiers, proposed destination, action, and values. It queries project, task, request, and prior-source records through narrowly scoped database MCP tools. The LLM selects the likely table and action, but cannot construct SQL or choose arbitrary database fields to write.
4. A deterministic reconciler compares the LLM's proposed destination and action with the email evidence and current record. It produces `no_change`, `create_activity`, `create_request`, `update_task`, `update_request`, or `needs_review`. For example, a daily report may map to `activity_log`, a task status claim to `project_task`, and a technical query to `request`. A change order maps to `review_only` until approved. Explicit identifiers and a unique project match are required for automatic record updates. Missing, conflicting, or stale evidence goes to review.
5. The pipeline submits the eligible actions for one message to a dedicated database MCP apply tool. That tool writes all actions and marks the message complete in one transaction. One `activity_log` row with `source_type='gmail_scanner'` and `source_path=<Gmail message ID>` stores classification, decision, short source evidence, and action result. A unique index on that source pair makes cron retries idempotent.

## Automatic update policy

- Daily updates can create an activity log and update a task's status only when the email gives an explicit task ID and a valid forward transition: `not_started` to `in_progress`, or `in_progress` to `complete`. `blocked`, reversals, and skips require review. The current task schema has no progress percentage, so numeric progress is not written in this version.
- Technical queries can create a request when they have a clear project match and no existing request with the same explicit reference or Gmail source. Existing technical-query status can update only with an explicit request ID and unambiguous status evidence.
- Change orders are classified and recorded for review. They never automatically alter task progress, cost, budget, or an existing request's approval status.
- A message spanning categories can produce multiple proposed actions, but all actions retain the same Gmail source ID. The pipeline does not infer numeric percent complete from qualitative phrases. An email's reported date must be present and later than the most recent previously applied source date for that target; otherwise its status update requires review.
- An email with no clear project match, conflicting identifiers, unsupported status, missing body, or model failure is recorded as `needs_review` or `failed`, with no project-data mutation.

## Data and interfaces

Reuse `activity_log`; do not add a new table. Make its `project_id` nullable so unmatched emails can be recorded for review, and add nullable `processing_state` and `processing_details jsonb` columns for scanner rows. Add a partial unique index on `(source_type, source_path)` where `source_type='gmail_scanner'`. Provide an idempotent migration for existing PostgreSQL databases as well as the updated schema for fresh installs. Existing project activity rows keep their current structure and behavior. The scanner's row is also its daily activity record; it does not create a duplicate log. Applied actions and reported dates live in `processing_details`. Add focused database MCP tools for lookup and atomic application of the permitted actions. The apply tool verifies project and target IDs, allowed status transitions, source ID, and current state in one transaction. Retain the existing Gmail MCP read interface and add a command entry point for the scheduled pipeline. Deploy cron every 15 minutes by default; the schedule is deployment configuration, not an in-process scheduler.

The command accepts a Gmail query and batch limit; defaults should cover recent inbox messages and avoid an unbounded backfill. Each run prints counts for scanned, skipped, updated, review, and failed messages. Failures on one message do not stop the batch. A process lock prevents overlapping runs; the unique activity-log source key protects retries after crashes.

## Security and failure handling

Treat email text as untrusted data: the extraction prompt forbids acting on instructions inside email. Validate the model's structured output and permit writes only through fixed database tools. Keep Gmail read-only. Keep the API key and OAuth token out of logs and database records. Store a short evidence excerpt and Gmail ID, not the entire message body, in `activity_log`. If the model, Gmail, or database is unavailable, leave the message retryable and report the failure. Do not mark a message complete until all intended database actions commit.

## Verification

Use mocked Gmail, model, and database MCP clients to check classification, duplicate emails, unique and ambiguous matches, stale updates, multi-category messages, change-order review, per-message failure isolation, and retry behavior. Add a manual dry run against a small Gmail query that reports decisions without database mutations before enabling cron writes.
