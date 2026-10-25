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
|  (5. Record for Review) ----> Write proposed actions to `activity_log`             |
|        |                                                                          |
|        v                                                                          |
|  [Frontend UI] -------------> Real-time Milestone cards & interactive Task Log    |
+-----------------------------------------------------------------------------------+
```

### Detailed Pipeline Stages

#### 1. Ingestion & Deduplication
- **Scheduled Scanner (`backend/reconciliation/scan_updates.py`)**: Runs automatically on a configurable cron schedule (e.g. every 15 minutes via `deploy/install-gmail-cron.sh`) or manually via CLI.
- **OAuth Read-Only Scope**: Uses `backend/integrations/gmail_service.py` with minimal `gmail.readonly` permissions to fetch inbox messages.
- **Idempotency**: Message IDs are verified against existing entries in `activity_log.source_path`. Already-processed messages are immediately skipped, preventing double-processing.

#### 2. AI Parsing & Extraction
- Powered by LangChain and DeepSeek (`backend/reconciliation/email_reconciliation.py`) using structured model output.
- The model reads the allowed entities and fields from the Database MCP (`get_project_entity_schema`) and returns an `EmailExtraction`: categories, project ID, reported date, summary, the proposed project actions and any unresolved issue.

```python
class EmailAction(BaseModel):
    operation: Literal["create", "update"]
    entity: str                       # e.g. "project_task", "request", "risk_register"
    record_id: str = ""               # exactly as written in the email; empty for create
    changes: list[FieldChange]        # field/value pairs from the allowed changes list
    evidence: str                     # short quote from the email
    confidence: Literal["high", "medium", "low"]

class EmailExtraction(BaseModel):
    categories: list[ActivityCategory]
    project_id: str
    reported_date: date | None
    summary: str
    actions: list[EmailAction]        # one per change the email states
    unresolved_issue: str             # a problem no action records
```

#### 3. Deterministic Reconciler & Safety Guardrails
To prevent hallucinations and protect project data integrity, the pipeline applies hard deterministic guardrails:
- **Human Review**: Email actions are never applied automatically. Every proposed action is recorded in `activity_log` as `needs_review` for a person to approve.
- **Grounding**: The model sees the project's current records, so it can match a named record to its ID. Every cited ID should appear exactly in the email; IDs matched by name from the records are flagged for the reviewer, and IDs in neither are reported. A task status change needs a date stated in the email (`ground_email`). Problems are shown to the reviewer as the reason.
- **Same Rules as Agents**: Each proposed action is checked against the Database MCP's entity policies, status transitions (see `backend/core/project_rules.py`) and evidence rules, then rolled back. The result (`ok` or the blocking rule) is stored with the action.
- **Change Orders**: A new `CO-` reference is proposed as an `open` request; it is never approved automatically.
- **Untrusted Content Sanitization**: Raw email text is treated as untrusted data. The LLM cannot construct or execute raw SQL.

#### 4. Recording via the Database MCP
Database operations are handled through the Database MCP server (`backend/mcp_servers/mcp_db_server.py`):
- **`get_project_entity_schema`**: Supplies the allowed changes for the prompt.
- **`list_projects`** / **`get_project_records`**: Find the project the email mentions and load its current records (every policy entity, scoped to the project) for the prompt and the existence check.
- **`record_email_decision`**: Writes one `activity_log` row per email (`source_type='gmail'`, `source_path=<Message ID>`, `processing_state='needs_review'|'no_change'`) with sender, evidence, reason and the checked `proposed_actions` in `processing_details`. It never changes project records.
  - Protected by a unique index on `activity_log(source_type, source_path)`.


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
