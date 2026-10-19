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
- **Reconciliation Agent**: Automatically ingests communications (e.g., Gmail daily reports), extracts progress updates, verifies facts against the PostgreSQL database, and safely applies verified task status changes.
- **Risk Estimation Agent**: Estimates the likelihood and impact of risks based on reconciled project data.
- **Compliance Agent**: Reviews designs, materials, and project documentation against regulatory standards.

## Automated Reconciliation System

The platform features an autonomous, background reconciliation pipeline that reconciles incoming emails (progress reports, daily logs, and technical queries) with the PostgreSQL project database and reflects live status in the UI without requiring human intervention.

```
+-----------------------------------------------------------------------------------+
|                              RECONCILIATION FLOW                                  |
|                                                                                   |
|  [Gmail Inbox]                                                                    |
|        |                                                                          |
|        v                                                                          |
|  (1. Poll Messages) --------> Skip already processed messages (deduplication)     |
|        |                                                                          |
|        v                                                                          |
|  (2. LLM Extraction) -------> LLM extracts: Project, Task, Status, Quote     |
|        |                                                                          |
|        v                                                                          |
|  (3. DB Context Lookup) ----> Database MCP checks current task status & timestamps|
|        |                                                                          |
|        v                                                                          |
|  (4. Deterministic Rules) --> Enforce forward transitions & quarantine risks      |
|        |                      (Change orders & conflicts -> 'needs_review')       |
|        v                                                                          |
|  (5. Atomic Apply) ---------> Write to `activity_log` & update `project_task`     |
|        |                                                                          |
|        v                                                                          |
|  [Frontend UI] -------------> Real-time Milestone cards & interactive Task Log    |
+-----------------------------------------------------------------------------------+
```

### Detailed Pipeline Stages

#### 1. Ingestion & Deduplication
- **Scheduled Scanner (`backend/scan_updates.py`)**: Runs automatically on a configurable cron schedule (e.g. every 15 minutes via `deploy/install-gmail-cron.sh`) or manually via CLI.
- **OAuth Read-Only Scope**: Uses `backend/gmail_service.py` with minimal `gmail.readonly` permissions to fetch inbox messages.
- **Idempotency**: Message IDs are verified against existing entries in `activity_log.source_path`. Already-processed messages are immediately skipped, preventing double-processing.

#### 2. AI Parsing & Extraction
- Powered by LangChain and DeepSeek (`backend/email_reconciliation.py`) using structured model output.
- Extracted structured payload enforces the strict Pydantic schema (`EmailFacts`):

```python
class EmailFacts(BaseModel):
    categories: list[Literal["daily_update", "technical_query", "change_order", "other"]] = Field(
        default_factory=list,
        description="Identified communication categories."
    )
    project_id: str = Field(default="", description="Explicit project code, e.g. 'PRJ-2401'.")
    task_id: str = Field(default="", description="Explicit task reference code, e.g. 'TSK-102'.")
    request_id: str = Field(default="", description="Explicit request reference code, e.g. 'CR-001' or 'TQ-002'.")
    reported_date: date | None = Field(default=None, description="Date reported in message header or body.")
    reported_status: Literal["", "not_started", "in_progress", "completed", "blocked"] = Field(
        default="",
        description="Normalized task lifecycle status."
    )
    destination: Literal["activity_log", "project_task", "request", "review_only"] = Field(
        default="review_only",
        description="Intended target table."
    )
    action: Literal["create", "update", "no_change", "review"] = Field(
        default="review",
        description="Proposed database mutation."
    )
    evidence: str = Field(
        default="",
        description="Direct key phrase or verbatim quote from the email explaining the status (not the full email body)."
    )
    summary: str = Field(
        default="",
        description="Concise 1-2 sentence overall summary of the entire email content."
    )
    uncertain: bool = Field(
        default=False, 
        description="Flag set to True if a match, identifier, or status claim is ambiguous."
    )
```

#### 3. Deterministic Reconciler & Safety Guardrails
To prevent hallucinations and protect project data integrity, the pipeline applies hard deterministic guardrails:
- **Forward-Only State Transitions**: Only valid forward progressions are permitted automatically (`not_started` -> `in_progress` -> `completed`). Regressions, cancellations, or skipped milestones require human review.
- **Change Order Isolation**: Emails proposing change orders or cost modifications are strictly mapped to `needs_review` and recorded in `activity_log`. They **never** automatically modify budgets, costs, or schedule baselines.
- **Stale Update Prevention**: Compares the email's timestamp against prior logged updates for that task. Outdated reports cannot overwrite newer status changes.
- **Untrusted Content Sanitization**: Raw email text is treated as untrusted data. The LLM cannot construct or execute raw SQL.

#### 4. Atomic Database Updates via MCP
Database operations are handled securely through the Database MCP server (`backend/mcp_db_server.py`):
- **`lookup_email_context`**: Validates project existence, task IDs, and current state.
- **`apply_email_decision`**: Executes the changes in an atomic PostgreSQL transaction:
  - Inserts a record into `activity_log` with the foreign key `task_id`, `source_type='gmail_scanner'`, `source_path=<Message ID>`, `state='applied'|'needs_review'`, and sender/quote metadata stored in `processing_details`.
  - Updates the corresponding record in `project_task` (e.g., `status = 'completed'`).
  - Protected by a unique partial index on `activity_log(source_type, source_path)`.


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
