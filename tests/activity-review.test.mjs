import assert from "node:assert/strict";
import { buildEditedChanges, coerceFieldValue, describeProposal, evidenceQuotes, formatValue, linkEvidence } from "../src/pages/projects/activities/activityReview.js";

assert.equal(describeProposal({ operation: "update", entity: "project_task", record_id: "TSK-103" }), "Update task TSK-103");
assert.equal(describeProposal({ operation: "create", entity: "risk_register" }), "Create risk");


assert.equal(coerceFieldValue({ type: "number" }, "12.5"), 12.5);
assert.equal(coerceFieldValue({ type: "integer" }, "7"), 7);
assert.deepEqual(coerceFieldValue({ type: "string_list" }, "Schedule, Cost"), ["Schedule", "Cost"]);
assert.equal(coerceFieldValue({ type: "date" }, "2026-09-21"), "2026-09-21");
assert.equal(coerceFieldValue({ type: "string" }, "  "), null);

const fields = { status: { type: "string" }, cost_actual: { type: "number" } };
assert.deepEqual(buildEditedChanges(fields, { status: "blocked", cost_actual: "" }), { changes: { status: "blocked" }, errors: [] });
assert.deepEqual(buildEditedChanges(fields, { cost_actual: "abc" }).errors, ["cost_actual must be a number", "Keep at least one change"]);

assert.equal(formatValue(null), "—");
assert.equal(formatValue(["a", "b"]), "a, b");

assert.deepEqual(
  evidenceQuotes({ evidence: { status: "TSK-103 is done", end_date: "TSK-103 is done", note: "Set by reviewer" } }),
  ["TSK-103 is done"],
);

const body = "Hi team,\nTSK-103 is\ndone as of 21 Sep.\nAlso the crane is late.";
const linked = linkEvidence(body, [
  { evidence: { status: "“TSK-103 is done" } },
  { evidence: { risk: "not in the email" } },
  { evidence: { note: "the CRANE is late." } },
]);
assert.deepEqual([...linked.found], [0, 2]);
assert.equal(linked.segments.map((segment) => segment.text).join(""), body);
assert.deepEqual(
  linked.segments.filter((segment) => segment.ref !== null).map((segment) => [segment.ref, segment.text]),
  [[0, "TSK-103 is\ndone"], [2, "the crane is late"]],
);
assert.deepEqual(linkEvidence("", []).segments, []);

console.log("activity review helper tests passed");
