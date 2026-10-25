import assert from "node:assert/strict";
import { filterActivitiesByDate } from "../src/pages/projects/activities/activityLog.js";

const now = new Date("2026-10-16T12:00:00");
const activities = [
  { id: "today", received: "2026-10-16 08:30" },
  { id: "week", received: "2026-10-12 09:00" },
  { id: "month", received: "2026-09-25 09:00" },
  { id: "old", received: "2026-08-01 09:00" },
  { id: "missing", received: "" },
];

assert.deepEqual(
  filterActivitiesByDate(activities, "today", now).map(({ id }) => id),
  ["today"]
);
assert.deepEqual(
  filterActivitiesByDate(activities, "7days", now).map(({ id }) => id),
  ["today", "week"]
);
assert.deepEqual(
  filterActivitiesByDate(activities, "30days", now).map(({ id }) => id),
  ["today", "week", "month"]
);
assert.deepEqual(
  filterActivitiesByDate(activities, "all", now).map(({ id }) => id),
  ["today", "week", "month", "old", "missing"]
);

console.log("activity log date filter tests passed");
