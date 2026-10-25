import assert from "node:assert/strict";
import test from "node:test";

import {
  accountPath,
  activityReviewPath,
  chatPath,
  costAnalysisPath,
  projectPath,
  projectsPath,
  parseProjectRoute,
  requestDetailPath,
} from "../src/app/routes.js";

test("route builders create stable application URLs", () => {
  assert.equal(chatPath, "/");
  assert.equal(accountPath, "/account");
  assert.equal(projectsPath, "/projects");
  assert.equal(projectPath("PRJ-2401"), "/projects/PRJ-2401");
  assert.equal(
    costAnalysisPath("PRJ-2401", "Detailed Design"),
    "/projects/PRJ-2401/costs?phase=Detailed%20Design",
  );
  assert.equal(
    activityReviewPath("PRJ-2401", "ACT-8"),
    "/projects/PRJ-2401/activity/ACT-8",
  );
  assert.equal(
    requestDetailPath("PRJ-2401", "REQ-3"),
    "/projects/PRJ-2401/requests/REQ-3",
  );
});

test("project route parsing restores nested dashboard state", () => {
  assert.deepEqual(
    parseProjectRoute("/projects/PRJ-2401/activity/ACT-8", ""),
    {
      projectId: "PRJ-2401",
      activityId: "ACT-8",
      requestId: null,
      costPhase: null,
    },
  );
  assert.deepEqual(
    parseProjectRoute("/projects/PRJ-2401/costs", "?phase=Detailed%20Design"),
    {
      projectId: "PRJ-2401",
      activityId: null,
      requestId: null,
      costPhase: "Detailed Design",
    },
  );
});

test("route builders encode identifiers used as URL segments", () => {
  assert.equal(projectPath("Project A/B"), "/projects/Project%20A%2FB");
});

test("project route parsing does not crash on malformed URL encoding", () => {
  assert.deepEqual(parseProjectRoute("/projects/%", ""), {
    projectId: "%",
    activityId: null,
    requestId: null,
    costPhase: null,
  });
});
