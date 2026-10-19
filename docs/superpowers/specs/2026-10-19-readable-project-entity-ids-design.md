# Readable Project Entity IDs Design

## Goal

Replace UUID identifiers for phases, milestones, expenditures, and risks with readable project-scoped identifiers while preserving existing data and relationships.

## Identifier Format

- Project phase: `P-<number>`
- Milestone: `M-<number>`
- Expenditure: `EXP-<number>`
- Risk: `RSK-<number>`

Numbering starts at 1 independently for each entity type within each project. Because identifiers repeat across projects, their database identity is the composite `(project_id, entity_id)`.

## Schema Changes

Change these primary identifiers from UUID to text:

- `project_phase.phase_id`
- `milestone.milestone_id`
- `expenditure.expenditure_id`
- `risk_register.risk_id`

Replace their primary keys with `(project_id, <entity_id>)`. Change all dependent identifier columns to text and make foreign keys project-scoped:

- `milestone(project_id, phase_id)` references `project_phase(project_id, phase_id)`.
- `project_task(project_id, milestone_id)` references `milestone(project_id, milestone_id)`.
- `expenditure(project_id, phase_id)` references `project_phase(project_id, phase_id)`.
- `expenditure(project_id, milestone_id)` references `milestone(project_id, milestone_id)`.
- `lesson(project_id, phase_id)` references `project_phase(project_id, phase_id)`.

Existing deletion behavior remains unchanged: required relationships restrict deletion; optional composite relationships use PostgreSQL's column-specific `ON DELETE SET NULL (<entity_id>)` so the entity ID is cleared while `project_id` remains intact.

## ID Generation

Add `project_entity_counter(project_id, entity_type, last_number)` keyed by `(project_id, entity_type)`. A database function `next_project_entity_id(project_id, entity_type)` atomically inserts `1` or increments `last_number` with `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING`, then formats the configured prefix. This prevents duplicate IDs under concurrent creates.

The MCP server generates identifiers for create operations. Agent proposals must not supply or update these system-managed IDs. Existing non-MCP writers must use the same database helper or provide a valid unused project-scoped ID.

## Existing-Data Migration

Add an idempotent migration script that runs in one transaction:

1. Build UUID-to-readable-ID mappings for each project and entity type.
2. Assign deterministic numbers ordered by `created_at`, then the old UUID.
3. Remove affected foreign-key constraints.
4. Convert parent and dependent identifier columns to text through temporary columns.
5. Rewrite references from the mappings.
6. Install composite primary and foreign keys.
7. Initialize each counter to the project's highest assigned number so the next allocation increments it once.
8. Validate that every non-null reference resolves before committing.

Any collision, null required reference, or unresolved relationship aborts and rolls back the entire migration.

## Seed and Application Changes

Update `schema.sql` and `seed.sql` to create and reference explicit readable identifiers. Update MCP entity policies from `uuid` to `string`, mark the four IDs as server-managed, and generate them during create operations. Existing API and frontend payloads already treat identifiers as strings, so no response-shape change is required.

## Testing

Tests must verify:

- Identifiers restart independently for different projects.
- Concurrent counter allocation cannot return duplicates.
- Migration preserves phase-to-milestone, milestone-to-task, expenditure, and lesson relationships.
- All composite foreign keys reject cross-project references.
- MCP create generates the correct prefix and update cannot modify identifiers.
- Migration rollback leaves the original schema and data unchanged after validation failure.
