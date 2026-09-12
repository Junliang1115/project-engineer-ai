import React, { useEffect, useState } from "react";
import {
  AlertTriangle as Warning,
  ArrowLeft,
  ClipboardList as ClipboardText,
} from "lucide-react";
import { projects } from "./data.js";
import { Tag, Button, StatusTag, Progress, resolveProjectId, projectAliases } from "./ProjectTokens.jsx";
import ProjectSidebar from "./ProjectSidebar.jsx";
import {
  AttentionControls,
  MilestoneControls,
  CostOutlook,
  DeliveryControls,
  RiskControls,
} from "./ProjectControls.jsx";
import TechnicalQueriesSection from "./TechnicalQueriesSection.jsx";
import PhaseRail from "./PhaseRail.jsx";
import TaskTable, { TaskEvidence, getTaskEvidence } from "./TaskControlsSection.jsx";
import WorkforceOverview, { WORKFORCE_PROFILES, getProjectWorkforceTasks } from "./WorkforceSection.jsx";
import {
  CostChart,
  PhaseCostAnalysisPage,
  getPhaseExpenditures,
  getPhaseCategoryBreakdown,
  CATEGORY_CONFIG,
} from "./PhaseCostAnalysis.jsx";
import ProjectsList, { LoadingState } from "./ProjectsList.jsx";

// Re-exports for modular backwards-compatibility
export {
  WorkforceOverview,
  WORKFORCE_PROFILES,
  getProjectWorkforceTasks,
  CostChart,
  PhaseCostAnalysisPage,
  getPhaseExpenditures,
  getPhaseCategoryBreakdown,
  CATEGORY_CONFIG,
  TaskTable,
  TaskEvidence,
  getTaskEvidence,
  PhaseRail,
  ProjectsList,
  LoadingState,
  resolveProjectId,
  projectAliases,
};

function getProjectActivities(project) {
  return [
    {
      id: `${project.id}-ACT-01`,
      type: "Change order",
      source: "Client email",
      from: "Client commercial team",
      received: "2026-09-11 10:35",
      relatedTo: project.tasks[1]?.id || project.tasks[0]?.id,
      summary: `Requested commercial review for ${project.name} cost and schedule movement.`,
      action: "Route to cost control and compare against approved budget.",
    },
    {
      id: `${project.id}-ACT-02`,
      type: "Technical query",
      source: "Engineer message",
      from: "Design engineer",
      received: "2026-09-11 14:10",
      relatedTo: project.tasks[0]?.id,
      summary: "Asked whether the latest drawing revision changes the installation sequence.",
      action: "Attach response to the relevant task before updating progress.",
    },
    {
      id: `${project.id}-ACT-03`,
      type: "Engineer report",
      source: "Site report PDF",
      from: project.owner,
      received: "2026-09-10 18:20",
      relatedTo: project.issues[0]?.id,
      summary: "Daily report includes site photos, manpower count, material status, and open blockers.",
      action: "Use report evidence to validate status, risk, and progress changes.",
    },
    {
      id: `${project.id}-ACT-04`,
      type: "Source message",
      source: "Supplier update",
      from: "Package supplier",
      received: "2026-09-09 16:45",
      relatedTo: project.tasks.at(-1)?.id,
      summary: "Supplier confirmed latest delivery forecast and pending document requirements.",
      action: "Update the risk register if the forecast affects the current milestone.",
    },
  ];
}

export function ActivityLog({ project }) {
  const activities = getProjectActivities(project);

  return (
    <section className="panel activity-log-panel">
      <div className="section-head">
        <div>
          <h2>Activity log</h2>
          <p>Incoming emails, messages, reports, and queries linked to this project.</p>
        </div>
        <span>{activities.length} sources</span>
      </div>
      <div className="activity-log-list">
        {activities.map((activity) => (
          <article key={activity.id}>
            <div className="activity-log-main">
              <span className="activity-type">{activity.type}</span>
              <div>
                <strong>{activity.summary}</strong>
                <small>
                  {activity.source} / {activity.from} / {activity.received}
                </small>
              </div>
            </div>
            <div className="activity-log-meta">
              <span>{activity.relatedTo}</span>
              <p>{activity.action}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Issues({ issues }) {
  return (
    <section className="panel issues-panel">
      <div className="section-head">
        <div>
          <h2>Issues and lessons learned</h2>
          <p>Open constraints and retained delivery knowledge.</p>
        </div>
        <ClipboardText size={22} />
      </div>
      <div className="issue-list">
        {issues.map((issue) => (
          <article key={issue.id}>
            <div className="issue-main">
              <span className="issue-icon">
                <Warning size={18} />
              </span>
              <div>
                <strong>{issue.description}</strong>
                <span>
                  {issue.id} / Related task {issue.related_task_id}
                </span>
              </div>
            </div>
            <div className="issue-tags">
              <Tag
                type={
                  issue.severity === "High"
                    ? "red"
                    : issue.severity === "Learning"
                      ? "blue"
                      : "warm-gray"
                }
                size="sm"
              >
                {issue.severity}
              </Tag>
              <StatusTag status={issue.status} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProjectDetail({ project, onBack, onOpenCostAnalysis }) {
  const [costPhase, setCostPhase] = useState(project.phase || "Construction");

  const handleExploreMore = (phase) => {
    if (phase) {
      setCostPhase(phase);
    }
    window.location.hash = "costs";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const overview = (
    <>
      <div className="detail-heading">
        <div>
          <div className="title-line">
            <span>{project.id}</span>
            <Tag type="warm-gray" size="sm">
              {project.phase}
            </Tag>
          </div>
          <h1>{project.name}</h1>
          <p>
            Current milestone: Work package release · Forecast 23 Sep 2026 · Mock data
          </p>
        </div>
        <div className="detail-progress">
          <strong>{project.progress}%</strong>
          <span>Overall progress</span>
          <Progress value={project.progress} label={false} />
        </div>
      </div>
      <PhaseRail project={project} />
      <CostChart project={project} onExploreMore={handleExploreMore} />
      <AttentionControls project={project} />
      <RiskControls project={project} />
    </>
  );

  return (
    <ProjectSidebar
      project={project}
      onBack={onBack}
      sections={{
        overview,
        milestones: (
          <>
            <h1>Milestones</h1>
            <PhaseRail project={project} />
            <MilestoneControls project={project} />
          </>
        ),
        workforce: (
          <>
            <h1>Workforce</h1>
            <WorkforceOverview project={project} />
          </>
        ),
        costs: (
          <>
            <h1>Cost tracking</h1>
            <CostOutlook project={project} />
            <PhaseCostAnalysisPage project={project} initialPhase={costPhase} isEmbedded={true} />
          </>
        ),
        deliveries: (
          <>
            <h1>Critical deliveries</h1>
            <DeliveryControls project={project} />
          </>
        ),
        risks: (
          <>
            <h1>Risks</h1>
            <RiskControls project={project} />
          </>
        ),
        tasks: (
          <>
            <h1>Task controls</h1>
            <TaskTable tasks={project.tasks} />
          </>
        ),
        queries: <TechnicalQueriesSection project={project} />,
        activity: (
          <>
            <h1>Activity log</h1>
            <ActivityLog project={project} />
          </>
        ),
        issues: (
          <>
            <h1>Issues &amp; lessons</h1>
            <Issues issues={project.issues} />
          </>
        ),
      }}
    />
  );
}

function NotFound({ onBack }) {
  return (
    <main className="page not-found">
      <Warning size={32} />
      <span>404</span>
      <h1>Project not found</h1>
      <p>The requested project record is not available in this portfolio.</p>
      <Button onClick={onBack} renderIcon={ArrowLeft}>
        Return to projects
      </Button>
    </main>
  );
}

export default function ProjectsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    const match = window.location.pathname.match(/\/projects\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  });

  const [costAnalysisPhase, setCostAnalysisPhase] = useState(() => {
    if (window.location.pathname.includes("/costs")) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("phase") || "Construction";
    }
    return null;
  });

  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/\/projects\/([a-zA-Z0-9_-]+)/);
      const isCostPage = window.location.pathname.includes("/costs");
      setSelectedProjectId(match ? match[1] : null);
      if (isCostPage) {
        const urlParams = new URLSearchParams(window.location.search);
        setCostAnalysisPhase(urlParams.get("phase") || "Construction");
      } else {
        setCostAnalysisPhase(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleSelectProject = (id) => {
    setSelectedProjectId(id);
    setCostAnalysisPhase(null);
    window.history.pushState(null, "", `/projects/${id}`);
  };

  const handleBackToProjects = () => {
    setSelectedProjectId(null);
    setCostAnalysisPhase(null);
    window.history.pushState(null, "", "/projects");
  };

  const handleOpenCostAnalysis = (phase) => {
    const targetPhase = phase || "Construction";
    setCostAnalysisPhase(targetPhase);
    window.history.pushState(
      null,
      "",
      `/projects/${selectedProjectId}/costs?phase=${encodeURIComponent(targetPhase)}`
    );
  };

  const handleBackToProjectDetail = () => {
    setCostAnalysisPhase(null);
    window.history.pushState(null, "", `/projects/${selectedProjectId}#costs`);
  };

  let content;
  if (selectedProjectId) {
    const project = projects.find((p) => p.id === resolveProjectId(selectedProjectId));
    if (!project) {
      content = <NotFound onBack={handleBackToProjects} />;
    } else if (costAnalysisPhase) {
      content = (
        <PhaseCostAnalysisPage
          project={project}
          initialPhase={costAnalysisPhase}
          onBack={handleBackToProjectDetail}
        />
      );
    } else {
      content = (
        <ProjectDetail
          project={project}
          onBack={handleBackToProjects}
          onOpenCostAnalysis={handleOpenCostAnalysis}
        />
      );
    }
  } else {
    content = <ProjectsList onSelectProject={handleSelectProject} />;
  }

  return <div className="capital-portfolio-wrapper">{content}</div>;
}
