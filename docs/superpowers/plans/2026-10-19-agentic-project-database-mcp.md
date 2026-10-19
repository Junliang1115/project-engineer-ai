# Agentic Project Database MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add MCP tools that let agents inspect approved project entities and safely create or update records without arbitrary mutation SQL.

**Architecture:** Keep a server-owned entity policy registry beside the MCP tools. Schema discovery combines that policy with database metadata; record lookup and mutation accept entity names only after resolving them through the registry and use parameterized values inside transactions.

**Tech Stack:** Python 3.11, MCP Python SDK, psycopg 3, unittest

**Spec:** `docs/superpowers/specs/2026-10-19-agentic-project-database-mcp-design.md`

## Global Constraints

- Support project-related entities only.
- Permit create and update; never expose delete or arbitrary mutation SQL.
- Require `high` confidence and evidence for every changed field before automatic application.
- Verify project existence, record ownership, field policy, types, required fields, relationships, and status transitions.
- Construct table and column identifiers exclusively from the server-owned registry; parameterize all values.
- Preserve existing MCP tools during migration.

## Review Focus

- Mixed-case entity or operation input is normalized safely or rejected consistently.
- Boolean values are not accepted as numeric values despite Python's type hierarchy.
- Empty update maps and unknown fields never produce malformed SQL.
- Database constraints or races roll back the complete action.
- Generated identifiers are returned for UUID-backed create operations.

---

### Task 1: Entity policy and schema discovery

**Files:**
- Modify: `backend/mcp_servers/mcp_db_server.py`
- Create: `tests/project_entity_mcp_test.py`

**Interfaces:**
- Produces: `PROJECT_ENTITY_POLICIES`, `_validate_project_action(payload: dict) -> dict`, and MCP tool `get_project_entity_schema(entity: str = "") -> str`.

- [ ] **Step 1: Write failing tests**

Add tests asserting that the schema tool exposes only approved project entities, describes writable fields and operations, rejects unknown entities, excludes delete, and marks identifiers/audit fields read-only. Add validator tests for unknown fields, missing evidence, non-high confidence, booleans-as-numbers, empty changes, and invalid status transitions.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `python -m unittest tests.project_entity_mcp_test -v`
Expected: FAIL because the policy, validator, and schema tool do not exist.

- [ ] **Step 3: Implement the registry, validator, and schema tool**

Define policies for `project`, `project_phase`, `milestone`, `project_task`, `expenditure`, `activity_log`, `risk_register`, `lesson`, and `request`. Each policy declares table, ID column, project column, create/update support, field types, required create fields, allowed values, and transition rules; `project` is update-only because it has no parent project. Merge the policy with `information_schema.columns` output and return JSON.

- [ ] **Step 4: Run focused tests**

Run: `python -m unittest tests.project_entity_mcp_test -v`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(mcp): expose project entity policies`

### Task 2: Safe record lookup and create/update execution

**Files:**
- Modify: `backend/mcp_servers/mcp_db_server.py`
- Modify: `tests/project_entity_mcp_test.py`

**Interfaces:**
- Consumes: `PROJECT_ENTITY_POLICIES` and `_validate_project_action(payload: dict) -> dict` from Task 1.
- Produces: MCP tools `get_project_entity_record(entity: str, project_id: str, record_id: str) -> str` and `apply_project_entity_action(payload_json: str) -> str`.

- [ ] **Step 1: Write failing tests**

Add mocked-connection tests for project-scoped lookup, high-confidence create, high-confidence update, UUID identifier return, low-confidence `needs_review`, missing record, wrong-project ownership, missing required create fields, unsupported delete, parameterized values, audit recording for every outcome, and transaction rollback on execution failure.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `python -m unittest tests.project_entity_mcp_test -v`
Expected: FAIL because lookup and action tools do not exist.

- [ ] **Step 3: Implement record lookup**

Resolve identifiers only from the registry. Query by record ID and project ID, returning JSON with `found: false` when no owned record exists.

- [ ] **Step 4: Implement create/update execution**

Parse JSON, validate the proposal, lock update targets, enforce transition rules against current values, verify parent references, and execute one parameterized INSERT or UPDATE. Record the proposal, evidence, outcome, and applied changes through the activity log for `applied`, `rejected`, and `needs_review` outcomes. Return structured outcome JSON without exposing raw SQL.

- [ ] **Step 5: Run focused and existing MCP tests**

Run: `python -m unittest tests.project_entity_mcp_test tests.sharepoint_mcp_server_test -v`
Expected: PASS.

- [ ] **Step 6: Run all backend tests**

Run: `python -m unittest discover -s tests -p "*test.py" -v`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `feat(mcp): apply validated project entity actions`
