import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// Source file loaders
// ---------------------------------------------------------------------------
const readSrc = (filename) =>
  readFileSync(new URL(`../src/${filename}`, import.meta.url), "utf8");

const app = readSrc("App.jsx");
const chatPage = readSrc("ChatPage.jsx");
const projectsPage = readSrc("ProjectsPage.jsx");
const api = readSrc("api.js");
const projectsList = readSrc("ProjectsList.jsx");
const projectOverview = readSrc("ProjectOverview.jsx");
const projectSidebar = readSrc("ProjectSidebar.jsx");
const projectTokens = readSrc("ProjectTokens.jsx");
const milestoneSection = readSrc("MilestoneSection.jsx");
const changeOrderSection = readSrc("ChangeOrderSection.jsx");
const riskSection = readSrc("RiskSection.jsx");
const sharedControls = readSrc("SharedControls.jsx");
const costAnalysis = readSrc("CostAnalysis.jsx");
const lessonsRegister = readSrc("LessonRegister.jsx");
const rail = readSrc("Rail.jsx");
const accountPage = readSrc("AccountPage.jsx");
const data = readSrc("data.js");
const css = readSrc("App.css");
const projectSidebarCss = readSrc("ProjectSidebar.css");

// ---------------------------------------------------------------------------
// 1. App Shell, Navigation & Routing
// ---------------------------------------------------------------------------
assert.match(app, /AppNavbar/);
assert.match(app, /ChatPage/);
assert.match(app, /ProjectsPage/);
assert.match(app, /AccountPage/);
assert.match(app, /account-button/i);
assert.match(app, /Account/i);
assert.match(app, /\/account/i);
assert.match(app, /Project Engineer/i);
assert.match(app, /getInitialPage/i);
assert.match(app, /window\.location\.pathname/i);
assert.match(app, /history\.pushState/i);
assert.doesNotMatch(app, /Trader/);
assert.doesNotMatch(app, /market trends/i);

// ---------------------------------------------------------------------------
// 2. Chat & AI Assistants
// ---------------------------------------------------------------------------
assert.match(chatPage, /Analyze design/i);
assert.match(chatPage, /Risk analysis/i);
assert.match(chatPage, /Knowledge Bank/i);
assert.match(chatPage, /Upload design or project file/i);
assert.match(chatPage, /type="file"/i);
assert.match(chatPage, /handleLocalFileUpload/i);
assert.match(chatPage, /"m04-design-risk": projectSnapshot\.messages/i);
assert.doesNotMatch(chatPage, /Upload project documents/i);
assert.doesNotMatch(chatPage, /Add design files/i);
assert.doesNotMatch(chatPage, /simulateDesignAnalysis/i);
assert.doesNotMatch(chatPage, /API 570/i);
assert.doesNotMatch(chatPage, /Compliance screening assistant/i);
assert.doesNotMatch(chatPage, /Design analysis demo/i);
assert.doesNotMatch(chatPage, /CW-014 Cooling Water Pipe Layout/i);
assert.doesNotMatch(chatPage, /pumpPipingLayout/i);
assert.doesNotMatch(chatPage, /design-drawing-image/i);
assert.doesNotMatch(chatPage, /design-preview-card/i);

// ---------------------------------------------------------------------------
// 3. Account Page & Data Source Plugins
// ---------------------------------------------------------------------------
assert.match(accountPage, /Jun Liang/i);
assert.match(accountPage, /Sync All Sources/i);
assert.match(accountPage, /Data Source/i);
assert.match(accountPage, /Microsoft Teams/i);
assert.match(accountPage, /Gmail/i);
assert.match(accountPage, /SharePoint/i);
assert.match(accountPage, /Outlook/i);
assert.match(accountPage, /Google Drive/i);
assert.match(accountPage, /Latest refresh/i);
assert.match(accountPage, /role="switch"/);
assert.match(accountPage, /aria-checked/);
assert.match(accountPage, /plugin-toggle/i);
assert.doesNotMatch(accountPage, /Local Documents/i);
assert.doesNotMatch(accountPage, /Evidence connectors/i);
assert.doesNotMatch(accountPage, /Recent sync activity/i);
assert.doesNotMatch(accountPage, /Documents\/messages indexed/i);
assert.doesNotMatch(accountPage, /Indexed/i);

// ---------------------------------------------------------------------------
// 4. Projects Hub & Sidebar Navigation
// ---------------------------------------------------------------------------
assert.match(projectsList, /Project profiles/i);
assert.match(projectsList, /PROJECT OVERVIEW/i);
assert.match(projectsList, /Project register/i);
assert.match(projectsList, /All projects/i);
assert.match(projectsList, /Active projects/i);
assert.match(projectsList, /Open high risk/i);
assert.match(projectsList, /Approved budget/i);
assert.match(projectsList, /Risk issues/i);
assert.match(projectsList, /Search project, phase, or ID/i);
assert.doesNotMatch(projectsList, /import \{ projects \} from "\.\/data\.js"/);
assert.doesNotMatch(projectsList, /Mean progress/i);

assert.doesNotMatch(projectSidebar, /All projects/i);
assert.match(projectSidebar, /aria-label="Back to projects"/i);
assert.doesNotMatch(projectSidebar, /\/> Back<\/button>/i);
assert.match(projectSidebar, /setIsSidebarOpen/);
assert.match(projectSidebar, /Collapse project sidebar/);
assert.match(projectSidebar, /Expand project sidebar/);
assert.doesNotMatch(projectSidebar, /Workforce/i);
assert.match(projectSidebar, /Change orders/i);
assert.doesNotMatch(projectSidebar, /Critical deliveries/i);
assert.match(projectSidebarCss, /\.project-section-sidebar\s*\{[^}]*overflow-y:\s*hidden/s);
assert.match(projectSidebarCss, /\.project-section-sidebar\s*\{[^}]*position:\s*fixed/s);
assert.match(projectSidebarCss, /\.project-section-content\.page\s*\{[^}]*margin:\s*0 auto/s);
assert.match(projectSidebarCss, /\.project-section-content\.page\s*\{[^}]*max-width:\s*1200px/s);
assert.match(projectSidebarCss, /\.project-workspace\s*\{[^}]*column-gap:\s*24px/s);
assert.doesNotMatch(projectSidebarCss, /\.project-workspace\.sidebar-collapsed\s*\{[^}]*grid-template-columns/s);
assert.match(projectSidebarCss, /\.project-section-content\s*\{[^}]*grid-column:\s*2/s);

// ---------------------------------------------------------------------------
// 5. Project Detail & Modular Controls
// ---------------------------------------------------------------------------
assert.match(projectsPage, /ProjectsList/);
assert.match(projectsPage, /TaskTable/);
assert.doesNotMatch(projectsPage, /WorkforceOverview/);
assert.match(projectsPage, /CostAnalysisPage/);
assert.match(projectsPage, /MilestoneSection/);
assert.match(projectsPage, /Rail/);
assert.match(projectsPage, /fetchProjects/);
assert.match(api, /export async function triggerScanUpdates\(/);
assert.match(projectsPage, /await triggerScanUpdates\(\)/);
assert.match(projectsPage, /ProjectOverview/);
assert.match(projectsPage, /ChangeOrderControls/);
assert.match(projectsPage, /Change orders/i);
assert.match(projectsPage, /ActivityLog/i);
assert.match(projectsPage, /Activity log/i);
assert.match(projectsPage, /project\.activities/i);
assert.match(projectsPage, /Issues and lessons learned/i);
assert.doesNotMatch(projectsPage, /\bworkforce\b/i);
assert.doesNotMatch(projectsPage, /import \{ projects \} from "\.\/data\.js"/);
assert.doesNotMatch(projectsPage, /Critical deliveries/i);

assert.match(projectOverview, /Needs attention/i);
assert.doesNotMatch(projectOverview, /MilestoneControls/i);

// ---------------------------------------------------------------------------
// 6. Milestone Progression & Task Log
// ---------------------------------------------------------------------------
assert.match(rail, /Phase progression/i);
assert.match(milestoneSection, /Milestone progression/i);
assert.match(milestoneSection, /MilestoneRail/i);
assert.match(milestoneSection, /MilestoneGroupCard/i);
assert.match(milestoneSection, /getActiveMilestone/i);
assert.match(milestoneSection, /initialView\s*=\s*"active"/i);
assert.match(milestoneSection, /TaskLog/i);
assert.match(milestoneSection, /Source evidence/i);
assert.match(milestoneSection, /Validation note/i);
assert.match(milestoneSection, /Expand source/i);
assert.match(milestoneSection, /sourceType/i);
assert.doesNotMatch(milestoneSection, /milestone-group-header/);
assert.match(milestoneSection, /milestone-tasks-wrapper/);
assert.match(css, /\.phase-rail li\.is-selected\s*\{[^}]*border:\s*1px solid rgba\(255, 255, 255, 0\.22\)/s);

// ---------------------------------------------------------------------------
// 7. Cost Analysis & Financial Outlook
// ---------------------------------------------------------------------------
assert.match(costAnalysis, /Cost outlook/i);
assert.match(costAnalysis, /Cost by phase/i);
assert.match(costAnalysis, /Explore more/i);
assert.match(costAnalysis, /getPhaseExpenditures/i);

// ---------------------------------------------------------------------------
// 8. Change Orders & Compliance
// ---------------------------------------------------------------------------
assert.match(changeOrderSection, /project\.changeOrders/i);
assert.match(changeOrderSection, /Change-of-Material Compliance Workflow/i);
assert.match(changeOrderSection, /Agent determination/i);
assert.match(changeOrderSection, /Supported with conditions/i);
assert.match(changeOrderSection, /Not recommended/i);
assert.match(changeOrderSection, /Requires review/i);
assert.match(changeOrderSection, /Final reasoning/i);

// ---------------------------------------------------------------------------
// 9. Risk Register & Reasoning Panel
// ---------------------------------------------------------------------------
assert.match(riskSection, /Why it triggers/i);
assert.match(riskSection, /Trigger/i);
assert.match(riskSection, /Evidence \/ source/i);
assert.match(riskSection, /Affected milestone/i);
assert.match(riskSection, /Confidence/i);
assert.match(riskSection, /Recommended action/i);
assert.match(sharedControls, /risk-reasoning-card/i);
assert.match(sharedControls, /risk-reasoning-main/i);
assert.match(sharedControls, /risk-reasoning-aside/i);

// ---------------------------------------------------------------------------
// 11. Lessons Learned & Seed Mock Reference
// ---------------------------------------------------------------------------
assert.match(lessonsRegister, /Lesson Learned Register/i);
assert.match(lessonsRegister, /Project Phase/i);
assert.match(lessonsRegister, /Root Cause/i);
assert.match(lessonsRegister, /Lesson Learned/i);
assert.doesNotMatch(lessonsRegister, /Technical query/i);

assert.match(projectTokens, /PRJ-2401/i);
assert.match(projectTokens, /resolveProjectId/i);
assert.match(data, /Harbor Link Station/i);
assert.match(data, /Tower B Facade/i);
assert.match(data, /Prime Estate Podium/i);

// ---------------------------------------------------------------------------
// 12. CSS Component Selectors & Design System
// ---------------------------------------------------------------------------
assert.match(css, /\.app-navbar/);
assert.match(css, /\.chat-layout/);
assert.match(css, /\.capital-portfolio-wrapper/);
assert.match(css, /\.project-grid/);
assert.match(css, /\.project-card/);
assert.match(css, /\.phase-rail/);
assert.match(css, /\.table-scroll/);
assert.match(css, /\.issue-list/);
assert.match(css, /\.account-page/);
assert.match(css, /\.account-hero-card/);
assert.match(css, /\.account-metrics-grid/);
assert.match(css, /\.design-drawing-card/);
assert.match(css, /\.plugin-page/);
assert.match(css, /\.plugin-source-list/);
assert.match(css, /\.plugin-logo/);
assert.match(css, /\.milestone-progression-panel/);
assert.match(css, /\.milestone-rail/);
assert.match(css, /\.milestone-group-card/);
assert.match(css, /\.cost-explore-btn/);
assert.match(css, /\.phase-cost-nav/);
assert.match(css, /\.task-source-row/);
assert.match(css, /\.task-source-panel/);
assert.match(css, /\.source-evidence-grid/);
assert.match(css, /\.activity-log-panel/);
assert.match(css, /\.activity-log-list/);

console.log("✓ All frontend smoke test assertions passed successfully.");
