# Project Engineering Agent Platform

## Overview

This platform supports project engineering teams by combining chat-based assistance, multi-project tracking, technical query support, risk analysis, and compliance review. It uses specialized agents to reconcile project data, estimate risks, and check designs or materials against applicable standards.

## Scope

- **Design timeline and work plan**: Accounts for dependencies across project progress, workforce availability, and team skill mix.
- **Milestone and cost tracking**: Cross-references project timeline, milestone status, and spending data from multiple sources.
- **Risk estimation**: Assesses risks related to material delivery, construction delays, international price fluctuations, workforce availability, and hiring gaps.
- **Compliance and safety review**: Checks designs, materials, and construction plans against relevant regulatory and safety standards.

## Agents

- **Orchestration Agent**: Coordinates agent workflows, routes user requests, and combines outputs into a single response.
- **Reconciliation Agent**: Reads incoming project emails (e.g. Gmail daily reports) and their PDF attachments, proposes the record changes they report, checks them against the database rules, and queues them for an engineer to approve.
- **Risk Estimation Agent**: Estimates the likelihood and impact of risks based on reconciled project data.
- **Compliance Agent**: Reviews designs, materials, and project documentation against regulatory standards.

## Automated Reconciliation System

The reconciliation pipeline turns incoming project emails (daily reports, progress updates, technical queries, change orders) into **proposed** database changes that an engineer reviews. The AI reads and proposes; it never writes project records. Changes are applied only when a person approves them on the email review page.

```
+-----------------------------------------------------------------------------------+
|                              RECONCILIATION FLOW                                  |
|                                                                                   |
|  [Gmail Inbox]                                                                    |
|        |                                                                          |
|        v                                                                          |
|  (1. Fetch & dedupe) -------> Skip emails already in activity_log; save + parse   |
|        |                      PDF attachments                                     |
|        v                                                                          |
|  (2. Identify project) -----> AI picks the project from the real project list     |
|        |                                                                          |
|        v                                                                          |
|  (3. AI extraction) --------> Categories, summary, dates, proposed changes        |
|        |                                                                          |
|        v                                                                          |
|  (4. Grounding) ------------> Warnings: IDs not in the email, unverified dates... |
|        |                                                                          |
|        v                                                                          |
|  (5. Rule check & log) -----> Database MCP checks every change, rolls back,       |
|        |                      logs the email as needs_review                      |
|        v                                                                          |
|  (6. Human review) ---------> Engineer approves / edits / rejects each change     |
|                               -> only approved changes are written                |
+-----------------------------------------------------------------------------------+
```

### Pipeline Stages

#### 1. Fetch & Deduplicate
- **Trigger**: `POST /scan-gmail` from the app, or the CLI: `python backend/reconciliation/scan_updates.py --query "label:INBOX newer_than:7d" --limit 25` (add `--dry-run` to write nothing).
- **Gmail access**: `backend/integrations/gmail_service.py`, read-only (`gmail.readonly`) scope.
- **Deduplication**: an email already in `activity_log` (`source_type='gmail'`, `source_path=<message id>`) is skipped before any AI call. A unique index on `(source_type, source_path)` makes reprocessing a no-op.
- **PDF attachments**: are saved first (`backend/documents/document_store.py`, content-addressed under `public/request/`), then parsed with pdfplumber (`pdf_extractor.py`), so a file is never lost if parsing fails. Their text and tables go to the AI with the email.

#### 2. Identify the Project
`identify_project()` gives the AI every project (ID, name, client, location) from the Database MCP's `list_projects`. It returns the matching project with evidence and a confidence level. An ID that isn't in the list is dropped, so the AI can never invent a project. The project's current records are then loaded (`get_project_records`) so the AI can match names like "Work package release" to the real ID `M-007`.

#### 3. AI Extraction
`classify_email()` in `backend/reconciliation/email_reconciliation.py` (LangChain + DeepSeek, structured output) returns:

```python
class EmailAction(BaseModel):
    operation: Literal["create", "update"]
    entity: str                       # e.g. "project_task", "request", "risk_register"
    record_id: str = ""               # empty for create
    changes: list[FieldChange]        # only fields the Database MCP allows
    evidence: str                     # short quote from the email
    confidence: Literal["high", "medium", "low"]

class EmailDate(BaseModel):
    date: date                        # numeric dates are day-first: 1/10/2026 = 1 Oct 2026
    kind: Literal["reported", "planned", "due", "delayed_to", "other"]
    evidence: str                     # the exact words that state the date

class EmailExtraction(BaseModel):
    categories: list[ActivityCategory]   # e.g. daily_update, technical_query, change_order
    project_id: str                      # from step 2, not from this step
    dates: list[EmailDate]               # every date in the email and attachments
    reported_date: date | None           # only the "reported" date; never a planned or delay date
    summary: str                         # always mentions any problem, block or delay
    actions: list[EmailAction]
```

- The prompt lists exactly the entities, fields and values the Database MCP accepts (`get_project_entity_schema`).
- Email and attachment content is treated as untrusted. The prompt tells the model to ignore instructions inside it, and the model has no SQL or write tools.
- Dates are read by the model in any format; there is no regex date parsing, and the email's sent date is never used.

#### 4. Grounding
`ground_email()` checks the AI's answer against the email text and adds **warnings** for the reviewer. Warnings never drop the proposal:
- **Email-level warnings**: no project identified, project not in the database, project identified with low confidence, or an empty email.
- **Per-change warnings**: every cited ID should appear exactly in the email (`TSK-10` does not match `TSK-102`). An ID found only in the project records is flagged "matched by name, not written in the email"; an ID in neither is flagged as unknown.
- **Date status** (task status changes): `missing` when there is no reported date, `unverified` when the quoted date words aren't in the email, otherwise `ok`.

#### 5. Rule Check & Activity Log
`record_email_decision` in the Database MCP (`backend/mcp_servers/mcp_db_server.py`) checks every proposed change with **the same validator and write path that agents use**, inside a transaction that is always rolled back:
- entity policies, allowed fields and evidence (`_validate_project_action`);
- same-project references, status transitions (`backend/core/project_rules.py`) and duplicate creates (`_apply_project_action`).

Each change is stored with its `check` result (`ok` or the rule that would block it), and the email is logged as one `activity_log` row with `processing_state='needs_review'`. `processing_details` keeps the sender, categories, summary, proposed changes, warnings, dates and project evidence. Every email goes to review, including general updates with nothing to change (their summary is the remark). A new `CO-` change-order reference is proposed as an `open` request, which records it but doesn't approve it.

#### 6. Human Review
The activity log opens each email in the review page (`src/ActivityReview.jsx`). The page shows the original email (fetched from Gmail when opened, never stored), its attachments, the warnings, and every proposed change as *current → proposed*. `backend/reconciliation/activity_review.py` handles the decisions:
- **Approve**, optionally after editing the values or the record ID (edits are marked "Set by reviewer"). The change is applied immediately through the same validator and write path; a rule violation changes nothing.
- **Reject**, with a required note.
- **Close**, which rejects any undecided changes.

When every change is decided, the email becomes `applied` (at least one approved), `rejected` or `no_change`. Review is deliberately **not** an MCP tool, so no agent can approve its own proposals.

| Endpoint | Purpose |
|---|---|
| `POST /scan-gmail` | Run one scan (`query`, `limit`, `dry_run`) |
| `GET /activities/{id}/review` | Proposed changes with current values, warnings and date status |
| `GET /activities/{id}/email` | The original email from Gmail |
| `POST /activities/{id}/actions/{index}` | Approve or reject one change |
| `POST /activities/{id}/close` | Close the email, rejecting undecided changes |

The `/agent-runs` chat uses the same pipeline in dry-run mode: it reports what an email would put up for review, without writing anything.


## Knowledge Bank

The knowledge bank stores reusable project knowledge and supports both internal users and incoming external questions.

- Technical query support
- Lesson register
- Risk register
- Historical project decisions
- Similar-question matching for incoming emails
- Reusable answers for repeated engineering or compliance questions

## Pages

### 1. Chat Interface

The chat interface is the main entry point for users to ask questions and run project analysis.

Key functions:

- General project assistant chat
- Technical query support
- Design analysis
- Risk analysis
- Compliance and safety review
- Email-style question answering using the knowledge bank

Plus button actions:

- Upload project documents
- Add design files
- Run risk analysis
- Run compliance review
- Ask from knowledge bank
- Create or update a lesson learned

### 2. Projects

The project page manages multiple projects and their milestones.

Each project should include:

- Project overview
- Scope
- Timeline
- Work plan
- Milestones
- Budget and cost tracking
- Material delivery status
- Risk register
- Lesson register
- Compliance status

Milestone tracking should show:

- Planned date
- Forecast date
- Actual date
- Owner
- Status
- Cost impact
- Linked risks
- Linked dependencies

### 3. Technical Query

The technical query page helps users ask engineering, design, compliance, and project-delivery questions.

Supported query types:

- Technical design questions
- Material and specification questions
- Regulatory and compliance questions
- Safety review questions
- Lessons learned lookup
- Similar previous question lookup
- Risk and mitigation lookup

Example user questions:

- "What risks affect the current milestone?"
- "Does this material meet the required standard?"
- "Which delayed deliveries affect the design timeline?"
- "Have we answered a similar technical question before?"
- "What lessons learned apply to this construction method?"

## Suggested Workflow

1. User opens the chat interface.
2. User uploads or selects project data.
3. Orchestration Agent routes the request to the correct specialist agents.
4. Reconciliation Agent compares project data across sources.
5. Risk Estimation Agent identifies likely risks and impact.
6. Compliance Agent checks relevant design, material, and safety requirements.
7. Orchestration Agent summarizes the result and updates the project record, risk register, or knowledge bank where needed.

## How to run the project
1. Frontend: npm run dev
2. Backend: .\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000 --app-dir backend
