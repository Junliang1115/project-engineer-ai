import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const chatPage = readFileSync(new URL("../src/ChatPage.jsx", import.meta.url), "utf8");
const projectsPage = readFileSync(new URL("../src/ProjectsPage.jsx", import.meta.url), "utf8");
const projectsList = readFileSync(new URL("../src/ProjectsList.jsx", import.meta.url), "utf8");
const taskControls = readFileSync(new URL("../src/TaskControlsSection.jsx", import.meta.url), "utf8");
const workforceSection = readFileSync(new URL("../src/WorkforceSection.jsx", import.meta.url), "utf8");
const phaseCostAnalysis = readFileSync(new URL("../src/PhaseCostAnalysis.jsx", import.meta.url), "utf8");
const phaseRail = readFileSync(new URL("../src/PhaseRail.jsx", import.meta.url), "utf8");
const projectTokens = readFileSync(new URL("../src/ProjectTokens.jsx", import.meta.url), "utf8");
const data = readFileSync(new URL("../src/data.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/App.css", import.meta.url), "utf8");
const lessonsRegister = readFileSync(new URL("../src/LessonRegister.jsx", import.meta.url), "utf8");

assert.match(app, /AppNavbar/);
assert.match(app, /ChatPage/);
assert.match(app, /ProjectsPage/);
assert.match(app, /Project Engineer/i);
assert.match(app, /getInitialPage/i);
assert.match(app, /window\.location\.pathname/i);
assert.match(app, /history\.pushState/i);
assert.match(chatPage, /Analyze design/i);
assert.match(chatPage, /Risk analysis/i);
assert.match(chatPage, /Knowledge Bank/i);
assert.match(lessonsRegister, /Lesson Learned Register/i);
assert.match(lessonsRegister, /Project Phase/i);
assert.match(lessonsRegister, /Root Cause/i);
assert.match(lessonsRegister, /Lesson Learned/i);
assert.doesNotMatch(lessonsRegister, /Technical query/i);

// Modular projects structure assertions
assert.match(projectsPage, /ProjectsList/);
assert.match(projectsPage, /TaskTable/);
assert.match(projectsPage, /WorkforceOverview/);
assert.match(projectsPage, /PhaseCostAnalysisPage/);
assert.match(projectsPage, /PhaseRail/);

// ProjectsList assertions
assert.match(projectsList, /Capital projects/i);
assert.match(projectsList, /PROJECT OVERVIEW/i);
assert.match(projectsList, /Project register/i);
assert.match(projectsList, /Active projects/i);
assert.match(projectsList, /Approved budget/i);
assert.match(projectsList, /Mean progress/i);
assert.match(projectsList, /Open high issues/i);
assert.match(projectsList, /Search project, phase, or ID/i);

// Phase rail and cost analysis assertions
assert.match(phaseRail, /Phase progression/i);
assert.match(phaseCostAnalysis, /Cost by phase/i);
assert.match(phaseCostAnalysis, /Explore more/i);
assert.match(phaseCostAnalysis, /getPhaseExpenditures/i);
assert.match(css, /\.cost-explore-btn/);
assert.match(css, /\.phase-cost-nav/);

// Task controls assertions
assert.match(projectsPage, /Task controls/i);
assert.match(projectTokens, /PRJ-2401/i);
assert.match(projectTokens, /resolveProjectId/i);
assert.match(taskControls, /TaskEvidence/i);
assert.match(taskControls, /Source evidence/i);
assert.match(taskControls, /Validation note/i);
assert.match(taskControls, /Expand source/i);
assert.match(taskControls, /sourceType/i);
assert.match(css, /\.task-source-row/);
assert.match(css, /\.task-source-panel/);
assert.match(css, /\.source-evidence-grid/);

// Activity Log & Issues assertions
assert.match(projectsPage, /ActivityLog/i);
assert.match(projectsPage, /Activity log/i);
assert.match(projectsPage, /Change order/i);
assert.match(projectsPage, /Technical query/i);
assert.match(projectsPage, /Engineer report/i);
assert.match(projectsPage, /Source message/i);
assert.match(css, /\.activity-log-panel/);
assert.match(css, /\.activity-log-list/);
assert.match(projectsPage, /Issues and lessons learned/i);

// Workforce assertions
const projectSidebar = readFileSync(new URL("../src/ProjectSidebar.jsx", import.meta.url), "utf8");
assert.match(projectSidebar, /All projects/i);
assert.match(projectSidebar, /Workforce/i);
assert.match(projectsPage, /workforce:\s*\(?\s*<>\s*<h1>Workforce/i);
assert.match(workforceSection, /Site Worker Management/i);
assert.match(workforceSection, /Worker Type Needed/i);
assert.match(workforceSection, /Spec \/ Certification/i);
assert.match(workforceSection, /Need to Hire/i);
assert.match(workforceSection, /Hiring Action List/i);
assert.doesNotMatch(workforceSection, /Milestone Workforce Readiness/i);
assert.match(data, /Harbor Link Station/i);
assert.match(data, /Tower B Facade/i);
assert.match(data, /Prime Estate Podium/i);
assert.doesNotMatch(app, /Trader/);
assert.doesNotMatch(app, /market trends/i);
assert.match(css, /\.app-navbar/);
assert.match(css, /\.chat-layout/);
assert.match(css, /\.capital-portfolio-wrapper/);
assert.match(css, /\.project-grid/);
assert.match(css, /\.project-card/);
assert.match(css, /\.phase-rail/);
assert.match(css, /\.table-scroll/);
assert.match(css, /\.issue-list/);







