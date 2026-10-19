import assert from "node:assert/strict";
import { buildProjectOverview } from "../src/projectOverviewModel.js";

const overview = buildProjectOverview(
  {
    phase: "Construction",
    progress: 62,
    budget: 18.5,
    costs: [{ phase: "Construction", estimate: 18.5, actual: 20 }],
    milestones: [
      { name: "Foundation", status: "Complete", forecastDate: "2026-09-01" },
      { name: "Commissioning readiness", status: "Blocked", forecastDate: "2026-10-22" },
    ],
    tasks: [
      { id: "TSK-1", title: "Close safety evidence", status: "In progress", owner: "Safety lead", due_date: "2026-10-10" },
    ],
    risks: [
      { id: "RSK-1", title: "Late equipment release", impact: "High", status: "Open", owner: "Procurement lead", dueDate: "2026-10-18" },
    ],
    activities: [
      { id: "ACT-1", summary: "Drawing revision received", received: "2026-10-15 09:00", from: "Design lead" },
    ],
  },
  new Date("2026-10-15T12:00:00")
);

assert.equal(overview.costVariance, -1.5);
assert.equal(overview.currentMilestone.name, "Commissioning readiness");
assert.deepEqual(
  overview.notifications.map(({ type, title }) => [type, title]),
  [
    ["Overdue task", "Close safety evidence"],
    ["Risk", "Late equipment release"],
    ["Task update", "Drawing revision received"],
  ]
);

const currentPhaseOverview = buildProjectOverview({
  phase: "Construction",
  costs: [
    { phase: "Design", estimate: 24, actual: 26 },
    { phase: "Construction", estimate: 50, actual: 48 },
  ],
});
assert.equal(currentPhaseOverview.costVariance, 2);

console.log("✓ Project overview model prioritizes milestones and notifications.");
