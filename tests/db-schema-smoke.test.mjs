import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync(new URL("../backend/db/schema.sql", import.meta.url), "utf8");
const seed = readFileSync(new URL("../backend/db/seed.sql", import.meta.url), "utf8");

[
  "project",
  "project_phase",
  "milestone",
  "project_task",
  "activity_log",
  "risk_register",
  "request",
  "analysis",
  "lesson",
].forEach((table) => {
  assert.match(schema, new RegExp(`create table if not exists ${table}\\b`, "i"));
  assert.match(seed, new RegExp(`insert into\\s+${table}\\b`, "i"));
});

assert.match(schema, /create table if not exists expenditure\b/i);
assert.match(seed, /insert into\s+expenditure\b/i);
assert.equal((seed.match(/'EXP-\d{3}'/g) || []).length, 30);
// Readable IDs are zero-padded: phases to 2 digits, milestones, expenditures and risks to 3.
assert.doesNotMatch(seed, /'(P|M|EXP|RSK)-[1-9]\d?'/);
assert.match(schema, /create or replace function format_project_entity_id/i);
assert.match(schema, /check \(milestone_id ~ '\^M-\(\(\?!0\+\$\)\[0-9\]\{3\}\|\[1-9\]\[0-9\]\{3,\}\)\$'\)/);
assert.equal((schema.match(/on update cascade/gi) || []).length, 5);
assert.doesNotMatch(schema.match(/create table if not exists expenditure[\s\S]*?\);/i)?.[0] || "", /\bcurrency\b/i);

assert.doesNotMatch(schema, /\bcreate table if not exists workforce\b/i);
assert.doesNotMatch(schema, /\bcreate table if not exists workforce_requirement\b/i);
assert.doesNotMatch(seed, /\binsert into\s+workforce\b/i);
assert.doesNotMatch(seed, /\binsert into\s+workforce_requirement\b/i);

assert.match(schema, /\bimpact text not null default 'medium'/i);
assert.match(schema, /affected_areas text\[\] not null default/i);
assert.match(schema, /priority text not null default 'medium'/i);
assert.match(schema, /status text not null default 'forecast' check \(status in \('forecast', 'committed', 'incurred', 'invoiced', 'paid', 'cancelled'\)\)/i);
assert.match(schema, /expenditure_date date not null default current_date/i);
assert.match(schema, /create index if not exists idx_expenditure_project_phase/i);
assert.doesNotMatch(schema, /\bseverity\b/i);
assert.doesNotMatch(schema, /\bprobability\b/i);
assert.doesNotMatch(schema, /,\s*\)/);
assert.doesNotMatch(schema, /\bcreate table if not exists documents\b/i);
// Stored PDFs (backend/document_store.py): one row per file, its sources, and its parsed pages.
["document", "document_source", "document_page"].forEach((table) => {
  assert.match(schema, new RegExp(`create table if not exists ${table} \\(`, "i"));
});

const allowedWorkStatuses = "'planned', 'in_progress', 'completed', 'blocked'";
assert.match(schema, new RegExp(`constraint milestone_status_check check \\(status in \\(${allowedWorkStatuses}\\)\\)`, "i"));
assert.match(schema, new RegExp(`constraint project_task_status_check check \\(status in \\(${allowedWorkStatuses}\\)\\)`, "i"));
const milestoneSeed = seed.match(/insert into milestone[\s\S]*?insert into project_task/i)?.[0] || "";
assert.doesNotMatch(milestoneSeed, /'active'/i);
assert.match(milestoneSeed, /'in_progress'/i);

assert.doesNotMatch(schema, /agent_runs/i);
assert.doesNotMatch(schema, /agent_findings/i);
assert.match(schema, /processing_state text/i);
assert.match(schema, /processing_details jsonb/i);
assert.match(schema, /unique index if not exists uq_activity_log_(gmail_)?source\s+on activity_log \(source_type, source_path\)/i);
assert.match(seed, /Harbor Link Station/i);
assert.match(seed, /Pipe wall thickness below project class requirement/i);
assert.doesNotMatch(seed, /\bprobability\b/i);
assert.doesNotMatch(seed, /\bchange_orders\b/i);
assert.doesNotMatch(seed, /\bcompliance_checks\b/i);
assert.match(seed, /insert into request \(request_id, project_id, title, request_type, description, status\)/i);
assert.match(seed, /'change_order'/i);
assert.doesNotMatch(seed, /requested_change/i);
assert.match(readFileSync(new URL("../backend/projects/database.py", import.meta.url), "utf8"), /set status = %s, progress_percent = %s\s+where phase_id = %s and project_id = %s/i);
