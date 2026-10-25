import React, { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle as Warning,
  ArrowLeft,
  ClipboardList as ClipboardText,
  RotateCcw,
} from "lucide-react";
import { fetchProjects, fetchProjectsMeta, triggerScanUpdates } from "./api.js";
import { Tag, StatusTag } from "./components/Tag.jsx";
import { Button } from "./components/Button.jsx";
import { Progress } from "./components/Progress.jsx";
import { filterActivitiesByDate } from "./activityLog.js";

export const phases = [
  "Concept",
  "Feasibility",
  "Design",
  "Procurement",
  "Construction",
  "Handover",
];

export const phaseIndex = (phase) => phases.indexOf(phase);

export const projectAliases = {
  "PRJ-2401": "PRJ-01",
};

export function resolveProjectId(id) {
  return projectAliases[id] || id;
}

export const money = (value, compact = false) =>
  compact
    ? `$${value.toFixed(value % 1 ? 1 : 0)}M`
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);

import ProjectSidebar from "./ProjectSidebar.jsx";
import ProjectOverview, { AttentionControls } from "./ProjectOverview.jsx";
import RiskControls from "./RiskSection.jsx";
import RequestSection from "./RequestSection.jsx";
import RequestDetailPage from "./RequestDetailPage.jsx";
import ActivityReview from "./ActivityReview.jsx";
import LessonRegister, { LESSON_TABLE_COLUMNS } from "./LessonRegister.jsx";
import ActivityLog from "./ActivityLog.jsx";
import "./LessonsPage.css";
import "./ActivityLog.css";
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
  Tag,
  StatusTag,
  Button,
  Progress,
  CostChart,
  CostAnalysisPage,
  getPhaseExpenditures,
  getPhaseCategoryBreakdown,
  CATEGORY_CONFIG,
  TaskTable,
  TaskLog,
  getTaskLog,
  ProjectsList,
  LoadingState,
  ProjectOverview,
  RequestSection,
  RiskControls,
  CostOutlook,
  AttentionControls,
  ActivityLog,
};

export function ProjectDetail({
  project,
  onBack,
  onOpenCostAnalysis,
  onSelectRequest,
  onSelectActivity,
}) {
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
        overview: (
          <ProjectOverview
            project={project}
            onExploreMore={handleExploreMore}
          />
        ),
        milestones: <MilestoneSection project={project} />,
        costs: (
          <>
            <div className="section-page-header">
              <div>
                <h1>Cost tracking</h1>
                <p className="section-page-description">
                  Monitor planned budgets, actual spending, and cost variance.
                </p>
              </div>
            </div>
            <CostAnalysisPage
              project={project}
              initialPhase={costPhase}
              isEmbedded={true}
            />
          </>
        ),
        requests: (
          <RequestSection project={project} onSelectRequest={onSelectRequest} />
        ),
        risks: <RiskControls project={project} />,
        activity: (
          <ActivityLog project={project} onSelectActivity={onSelectActivity} />
        ),
        lessons: <LessonRegister project={project} />,
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
    const match = window.location.pathname.match(
      /\/projects\/([a-zA-Z0-9_-]+)/,
    );
    return match ? match[1] : null;
  });

  const [selectedRequestId, setSelectedRequestId] = useState(() => {
    const reqMatch = window.location.pathname.match(
      /\/projects\/[a-zA-Z0-9_-]+\/requests\/([a-zA-Z0-9_-]+)/,
    );
    return reqMatch ? reqMatch[1] : null;
  });

  const [selectedActivityId, setSelectedActivityId] = useState(() => {
    const activityMatch = window.location.pathname.match(
      /\/projects\/[a-zA-Z0-9_-]+\/activity\/([a-zA-Z0-9_-]+)/,
    );
    return activityMatch ? activityMatch[1] : null;
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
      const scanResponse = await triggerScanUpdates();
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
      const match = window.location.pathname.match(
        /\/projects\/([a-zA-Z0-9_-]+)/,
      );
      const isCostPage = window.location.pathname.includes("/costs");
      setSelectedProjectId(match ? match[1] : null);
      const activityMatch = window.location.pathname.match(
        /\/activity\/([a-zA-Z0-9_-]+)/,
      );
      setSelectedActivityId(activityMatch ? activityMatch[1] : null);
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
    setSelectedRequestId(null);
    setSelectedActivityId(null);
    window.history.pushState(null, "", `/projects/${id}`);
  };

  const handleBackToProjects = () => {
    setSelectedProjectId(null);
    setCostAnalysisPhase(null);
    setSelectedRequestId(null);
    setSelectedActivityId(null);
    window.history.pushState(null, "", "/projects");
  };

  const handleOpenCostAnalysis = (phase) => {
    const targetPhase = phase || "Construction";
    setCostAnalysisPhase(targetPhase);
    window.history.pushState(
      null,
      "",
      `/projects/${selectedProjectId}/costs?phase=${encodeURIComponent(targetPhase)}`,
    );
  };

  const handleBackToProjectDetail = () => {
    setCostAnalysisPhase(null);
    window.history.pushState(null, "", `/projects/${selectedProjectId}#costs`);
  };

  const handleSelectRequest = (requestId) => {
    setSelectedRequestId(requestId);
    window.history.pushState(
      null,
      "",
      `/projects/${selectedProjectId}/requests/${requestId}`,
    );
  };

  const handleBackToRequests = () => {
    setSelectedRequestId(null);
    window.history.pushState(null, "", `/projects/${selectedProjectId}`);
    setTimeout(() => {
      window.location.hash = "requests";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }, 0);
  };

  const handleSelectActivity = (activityId) => {
    setSelectedActivityId(activityId);
    window.history.pushState(
      null,
      "",
      `/projects/${selectedProjectId}/activity/${activityId}`,
    );
  };

  const handleBackToActivityLog = () => {
    setSelectedActivityId(null);
    window.history.pushState(null, "", `/projects/${selectedProjectId}`);
    setTimeout(() => {
      window.location.hash = "activity";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }, 0);
  };

  const refreshProjects = async () => {
    try {
      setProjects(await fetchProjects());
    } catch (error) {
      console.error("Refresh error:", error);
    }
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
    const projectRecord = projects.find(
      (p) =>
        p.id === selectedProjectId ||
        p.id === resolveProjectId(selectedProjectId),
    );
    const project = projectRecord
      ? { ...projectRecord, latestRefresh: lastUpdated }
      : null;
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
    } else if (selectedActivityId) {
      content = (
        <ActivityReview
          activityId={selectedActivityId}
          onBack={handleBackToActivityLog}
          onReviewed={refreshProjects}
        />
      );
    } else if (selectedRequestId) {
      const detailRequest = (project.requests || []).find(
        (r) => r.id === selectedRequestId,
      );
      content = detailRequest ? (
        <RequestDetailPage
          request={detailRequest}
          onBack={handleBackToRequests}
        />
      ) : (
        <NotFound onBack={handleBackToProjects} />
      );
    } else {
      content = (
        <ProjectDetail
          project={project}
          onBack={handleBackToProjects}
          onOpenCostAnalysis={handleOpenCostAnalysis}
          onSelectRequest={handleSelectRequest}
          onSelectActivity={handleSelectActivity}
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
