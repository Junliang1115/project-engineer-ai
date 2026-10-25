import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sidebarJsx = readFileSync(new URL("../src/pages/projects/ProjectSidebar.jsx", import.meta.url), "utf8");

// Extract and test resolveProjectSection directly from ProjectSidebar.jsx
const fnMatch = sidebarJsx.match(/const sectionIds = new Set\(\[[\s\S]*?export function resolveProjectSection\(hash = ""\) \{[\s\S]*?\n\}/);
assert.ok(fnMatch, "resolveProjectSection must be defined in ProjectSidebar.jsx");

const evaluator = new Function(
  `${fnMatch[0].replace("export function", "function")}; return resolveProjectSection;`
);
const resolveProjectSection = evaluator();

assert.equal(resolveProjectSection("#overview"), "overview");
assert.equal(resolveProjectSection("#milestones"), "milestones");
assert.equal(resolveProjectSection("#costs"), "costs");
assert.equal(resolveProjectSection("#requests"), "requests");
assert.equal(resolveProjectSection("#risks"), "risks");
assert.equal(resolveProjectSection("#activity"), "activity");
assert.equal(resolveProjectSection("#lessons"), "lessons");
assert.equal(resolveProjectSection("#unknown"), "overview");
assert.equal(resolveProjectSection(""), "overview");

console.log("project sidebar routing tests passed");
