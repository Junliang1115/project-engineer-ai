# Agentic Project Database MCP Design

## Goal

Allow an agent to inspect supported project data and propose safe create or update operations without encoding every destination in the email reconciliation code. Deletion and arbitrary SQL mutations remain unavailable.

## Scope

Supported entities are `project`, `project_phase`, `milestone`, `project_task`, `expenditure`, `activity_log`, `risk_register`, `lesson`, and `request`. The first implementation may expose only entities with complete policies; the schema response must clearly identify unsupported operations.

The agent may create or update records. It may not delete records, alter schema, select non-project tables, or submit SQL for mutation.

## MCP Contract

### `get_project_entity_schema`

Returns a policy-enriched schema catalog. Each entity includes its identifier, project ownership column, readable and writable fields, PostgreSQL type, nullability, required-on-create status, descriptions, allowed values, and supported operations.

Database metadata is read from `information_schema`; write permissions and business rules come from a server-owned policy registry. System-managed identifiers, audit timestamps, processing fields, and relationship keys are read-only unless explicitly allowed.

### `get_project_entity_record`

Accepts `entity`, `project_id`, and `record_id`. It returns the matching record only when it belongs to the project. This gives the agent current values before proposing an update.

### `apply_project_entity_action`

Accepts JSON with:

```json
{
  "operation": "create | update",
  "entity": "milestone",
  "project_id": "PRJ-2401",
  "record_id": "existing identifier for update",
  "changes": {"status": "active", "progress_percent": 10},
  "confidence": "high | medium | low",
  "evidence": {"status": "M1 started", "progress_percent": "10% complete"}
}
```

`changes` is flexible: the agent includes any relevant subset of writable fields. The server rejects unknown or read-only fields.

## Validation and Execution

The server validates before opening a write transaction:

1. Entity and operation are allowed.
2. Confidence is `high`; otherwise the response is `needs_review` without mutation.
3. The project exists.
4. Updates target an existing record owned by the project.
5. Creates contain all required fields and valid parent relationships.
6. Every changed field is writable and its value matches the declared type, range, and allowed values.
7. Each changed field has supporting evidence.
8. Entity-specific state transitions are valid.

Execution uses server-constructed, parameterized SQL. Table and column identifiers come only from the policy registry. The agent never supplies SQL identifiers directly.

## Results and Review

Successful responses return `applied`, the entity, record identifier, operation, and changed fields. Low-confidence or ambiguous actions return `needs_review` with validation reasons and the original proposal. Invalid requests return `rejected` and do not mutate data.

Every attempted action is recorded through the existing activity/audit mechanism, including the proposal, evidence, validation result, and applied changes. Review storage can be expanded separately; this MCP change will return a structured review payload compatible with the reconciliation flow.

## Compatibility

Existing email-specific tools remain available during migration. `email_reconciliation.py` can later replace its fixed destination branches with schema discovery, record lookup, and the generic action tool. Existing read-only SQL remains read-only.

## Testing

Unit tests cover schema filtering, create/update permission checks, type validation, project ownership, required fields, confidence routing, prohibited deletion, unknown fields, and SQL parameterization. Database integration tests cover one create and one update for each enabled entity plus transaction rollback on validation or constraint failure.
