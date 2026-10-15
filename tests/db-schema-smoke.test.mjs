import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync(new URL("../backend/db/schema.sql", import.meta.url), "utf8");
const seed = readFileSync(new URL("../backend/db/seed.sql", import.meta.url), "utf8");
const readme = readFileSync(new URL("../backend/db/README.md", import.meta.url), "utf8");

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

assert.doesNotMatch(schema, /\bcreate table if not exists workforce\b/i);
assert.doesNotMatch(schema, /\bcreate table if not exists workforce_requirement\b/i);
assert.doesNotMatch(seed, /\binsert into\s+workforce\b/i);
assert.doesNotMatch(seed, /\binsert into\s+workforce_requirement\b/i);

assert.match(schema, /\bimpact text not null default 'medium'/i);
assert.doesNotMatch(schema, /\bseverity\b/i);
assert.doesNotMatch(schema, /\bprobability\b/i);
assert.doesNotMatch(schema, /,\s*\)/);
assert.doesNotMatch(schema, /\bcreate table if not exists documents\b/i);

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
assert.match(readFileSync(new URL("../backend/database.py", import.meta.url), "utf8"), /set status = %s, progress_percent = %s\s+where phase_id = %s and project_id = %s/i);
assert.match(readme, /psql/i);
