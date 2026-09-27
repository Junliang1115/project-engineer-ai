import React, { useEffect, useState } from "react";
import {
  AlertTriangle as Warning,
  ArrowLeft,
  ClipboardList as ClipboardText,
} from "lucide-react";
import { fetchProjects, fetchProjectsMeta, triggerScanUpdates } from "./api.js";
import { Tag, Button, StatusTag, Progress, resolveProjectId, projectAliases } from "./ProjectTokens.jsx";
import ProjectSidebar from "./ProjectSidebar.jsx";
import ProjectOverview, { AttentionControls } from "./ProjectOverview.jsx";
import ChangeOrderControls from "./ChangeOrderSection.jsx";
import RiskControls from "./RiskSection.jsx";
import TechnicalQueriesSection from "./TechnicalQueriesSection.jsx";
import Rail from "./Rail.jsx";

import WorkforceOverview, { WORKFORCE_PROFILES, getProjectWorkforceTasks } from "./WorkforceSection.jsx";
import {
  CostChart,
  CostOutlook,
  CostAnalysisPage,
  getPhaseExpenditures,
  getPhaseCategoryBreakdown,
  CATEGORY_CONFIG,
} from "./CostAnalysis.jsx";
import ProjectsList, { LoadingState } from "./ProjectsList.jsx";
import MilestoneSection, {
  TaskTable,
  TaskLog,
  getTaskLog,
} from "./MilestoneSection.jsx";


// Re-exports for modular backwards-compatibility
export {
  WorkforceOverview,
  WORKFORCE_PROFILES,
  getProjectWorkforceTasks,
  CostChart,
  CostAnalysisPage,
  getPhaseExpenditures,
  getPhaseCategoryBreakdown,
  CATEGORY_CONFIG,
  TaskTable,
  TaskLog,
  getTaskLog,
  Rail,
  ProjectsList,
  LoadingState,
  resolveProjectId,
  projectAliases,
  ProjectOverview,
  ChangeOrderControls,
  RiskControls,
  CostOutlook,
  AttentionControls,
};


export function ActivityLog({ project }) {
  const activities = project.activities || [];

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

  return (
    <ProjectSidebar
      project={project}
      onBack={onBack}
      sections={{
        overview: <ProjectOverview project={project} onExploreMore={handleExploreMore} />,

        milestones: <MilestoneSection project={project} />,
        workforce: (
          <>
            <h1>Workforce</h1>
            <WorkforceOverview project={project} />
          </>
        ),
        costs: (
          <>
            <h1>Cost tracking</h1>
            <CostAnalysisPage project={project} initialPhase={costPhase} isEmbedded={true} />
          </>
        ),
        deliveries: (
          <>
            <h1>Change orders</h1>
            <ChangeOrderControls project={project} />
          </>
        ),
        risks: (
          <>
            <h1>Risks</h1>
            <RiskControls project={project} />
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
  const [projects, setProjects] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectLoadError, setProjectLoadError] = useState("");
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

  const loadData = async () => {
    try {
      const [records, meta] = await Promise.all([
        fetchProjects(),
        fetchProjectsMeta(),
      ]);
      setProjects(records);
      if (meta && meta.last_updated) {
        setLastUpdated(meta.last_updated);
      }
      setProjectLoadError("");
    } catch (error) {
      setProjectLoadError(error.message);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsScanning(true);
    try {
      const scanResponse = awaittriggerScanUpdates();
      if (scanResponse && scanResponse.last_updated) {
        setLastUpdated(scanResponse.last_updated);
      }
      // Re-fetch project records to show new tasks/requests/remarks
      const records = await fetchProjects();
      setProjects(records);
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setIsScanning(false);
    }
  };

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
  if (isLoadingProjects) {
    content = <LoadingState />;
  } else if (projectLoadError) {
    content = (
      <main className="page not-found">
        <Warning size={32} />
        <span>API</span>
        <h1>Project database unavailable</h1>
        <p>{projectLoadError}</p>
      </main>
    );
  } else if (selectedProjectId) {
    const project = projects.find((p) => p.id === selectedProjectId || p.id === resolveProjectId(selectedProjectId));
    if (!project) {
      content = <NotFound onBack={handleBackToProjects} />;
    } else if (costAnalysisPhase) {
      content = (
        <CostAnalysisPage
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
    content = (
      <ProjectsList
        projects={projects}
        onSelectProject={handleSelectProject}
        onRefreshProjects={handleRefresh}
        lastUpdated={lastUpdated}
        isScanning={isScanning}
      />
    );
  }

  return <div className="capital-portfolio-wrapper">{content}</div>;
}
