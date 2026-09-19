import React, { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  FileText,
  Building2,
  Check,
  AlertCircle,
  Mail,
} from "lucide-react";
import { Tag, Button, StatusTag, Progress, money } from "./ProjectTokens.jsx";
import Rail, { MilestoneRail } from "./Rail.jsx";
export { MilestoneRail, Rail };

export function getProjectMilestones(project) {
  // 1. If the database returns milestones, use the database records directly:
  if (project?.milestones && project.milestones.length > 0) {
    return project.milestones.map((m) => {
      const isComplete = m.status === "Complete";
      const isBlocked = m.status === "Blocked";

      return {
        id: m.id,
        name: m.name,
        phase: m.phase || project.phase,
        status: m.status,
        progress: m.progress != null ? m.progress : isComplete ? 100 : 0,
        forecastDate: m.forecastDate || m.due_date || "",
        plannedAmount: m.plannedAmount || 0,
        actualAmount: m.actualAmount || 0,
        owner: m.owner || m.tasks?.[0]?.owner || "Project lead",
        variance: m.variance || (isComplete ? "0 days" : isBlocked ? "+7 days" : "+3 days"),
        description: m.description || `Stage gate milestone delivery package for ${m.name}.`,
        blocker: m.blocker || (isBlocked ? "Material compliance / drawing inspection hold pending resolution" : null),
        tasks: m.tasks || [],
      };
    });


  }

  // 2. Fallback if project.milestones is not yet loaded:
  const phase = project?.phase || "Construction";
  const tasks = (project?.tasks || []).filter(
    (t) => (t.phase || phase).toLowerCase() === phase.toLowerCase()
  );

  return [
    {
      id: "M-01",
      name: "Substructure & Foundation Release",
      description: "Civil groundworks and foundation inspection sign-off.",
      status: "Complete",
      progress: 100,
      forecastDate: "2026-08-14",
      variance: "0 days",
      owner: "Civil delivery team",
      tasks: tasks.filter((t) => t.id === "TSK-101" || t.title.toLowerCase().includes("concrete")),
    },
    {
      id: "M-02",
      name: "Envelope & MEP Rough-in Release",
      description: "Curtain wall sequencing and MEP riser penetrations sign-off.",
      status: "In progress",
      progress: 75,
      forecastDate: "2026-09-18",
      variance: "+3 days",
      owner: "Envelope package team",
      blocker: "Approved drawing revision outstanding for exterior facade clips",
      tasks: tasks.filter((t) => t.id === "TSK-102" || t.title.toLowerCase().includes("curtain wall")),
    },
    {
      id: "M-04",
      name: "Work package release",
      description: "Primary HVAC chiller skids, CW-014 piping runs, and pump tie-in.",
      status: "In progress",
      progress: 58,
      forecastDate: "2026-09-30",
      variance: "+5 days",
      owner: "Mechanical lead",
      blocker: "Pipe wall thickness technical query and vendor inspection release",
      tasks: tasks.filter((t) => t.id === "TSK-103" || t.title.toLowerCase().includes("chiller") || t.title.toLowerCase().includes("pump")),
    },
    {
      id: "M-05",
      name: "Life Safety & Commissioning Readiness",
      description: "Fire suppression system testing and architectural finishes.",
      status: "Blocked",
      progress: 20,
      forecastDate: "2026-10-22",
      variance: "+7 days",
      owner: "Compliance lead",
      blocker: "Missing overseas fire-rated certificate on imported glazing supplier",
      tasks: tasks.filter((t) => t.id === "TSK-104" || t.id === "TSK-105" || t.title.toLowerCase().includes("fire")),
    },
  ];
}

export function getTaskEvidence(task) {
  const sourceType =
    task.status === "Complete" ? "Inspection record" : task.status === "Blocked" ? "Email" : "Site message";
  const sourceOwner =
    task.status === "Blocked" ? "Compliance inbox" : task.status === "Complete" ? task.owner : "Project controls";
  const sourceDate = task.status === "Complete" ? "2026-09-01 09:20" : "2026-09-11 16:45";
  const confidence =
    task.status === "Complete" ? "Validated" : task.status === "Blocked" ? "Needs review" : "Progress update";

  return {
    sourceType,
    sourceOwner,
    sourceDate,
    confidence,
    subject: `${task.id} / ${task.title}`,
    validationNote:
      task.status === "Complete"
        ? "Completion is validated from signed inspection evidence and cost actuals can be reconciled."
        : task.status === "Blocked"
          ? "Status remains blocked until the referenced message/document resolves the compliance hold."
          : "Progress should be updated from the latest site message, then checked against cost and schedule variance.",
  };
}

export function TaskEvidence({ evidence }) {
  return (
    <tr className="task-source-row">
      <td colSpan="8">
        <div className="task-source-panel">
          <div className="task-source-heading">
            <Mail size={17} aria-hidden="true" />
            <div>
              <strong>Source evidence</strong>
              <span>{evidence.subject}</span>
            </div>
          </div>
          <div className="source-evidence-grid">
            <div>
              <span>Source type</span>
              <strong>{evidence.sourceType}</strong>
            </div>
            <div>
              <span>Owner / sender</span>
              <strong>{evidence.sourceOwner}</strong>
            </div>
            <div>
              <span>Received</span>
              <strong>{evidence.sourceDate}</strong>
            </div>
            <div>
              <span>Status signal</span>
              <strong>{evidence.confidence}</strong>
            </div>
          </div>
          <p>
            <span>Validation note</span>
            {evidence.validationNote}
          </p>
        </div>
      </td>
    </tr>
  );
}

export const TaskTable = ({ tasks = [], project }) => {
  return <MilestoneSection project={project} />;
};




export function MilestoneGroupCard({
  milestone,
  isExpanded,
  onToggleExpand,
  expandedTaskId,
  onToggleTaskEvidence,
}) {
  const isComplete = milestone.status === "Complete";
  const isBlocked = milestone.status === "Blocked";

  return (
    <article className={`milestone-group-card ${isBlocked ? "has-blocker" : ""}`} id={`milestone-${milestone.id}`}>
      <header className="milestone-group-header" onClick={onToggleExpand} role="button" tabIndex={0}>
        <div className="milestone-header-main">
          <div className="milestone-badge-row">
            <span className="milestone-code-pill">{milestone.id}</span>
            <StatusTag status={milestone.status} />
            <span className="milestone-due-text">
              <Clock size={13} aria-hidden="true" />
              Target: {milestone.forecastDate}
            </span>
            {milestone.variance && milestone.variance !== "0 days" && (
              <span className={`milestone-variance-pill ${milestone.variance.includes("+") ? "is-late" : "is-ontime"}`}>
                {milestone.variance}
              </span>
            )}
          </div>
          <h3>{milestone.name}</h3>
          <p className="milestone-desc">{milestone.description}</p>
          {milestone.blocker && (
            <div className="milestone-blocker-alert">
              <AlertTriangle size={14} aria-hidden="true" />
              <span><strong>Blocker:</strong> {milestone.blocker}</span>
            </div>
          )}
        </div>

        <div className="milestone-header-aside">
          <div className="milestone-progress-box">
            <div className="progress-labels">
              <span>Gate Progress</span>
              <strong>{milestone.progress}%</strong>
            </div>
            <div className="milestone-mini-bar">
              <div
                className={`milestone-mini-fill ${isComplete ? "complete" : isBlocked ? "blocked" : "active"}`}
                style={{ width: `${milestone.progress}%` }}
              />
            </div>
            <span className="milestone-tasks-count">
              {milestone.tasks.length} {milestone.tasks.length === 1 ? "task" : "tasks"}
            </span>
          </div>
          <button
            type="button"
            className="milestone-toggle-btn"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse milestone tasks" : "Expand milestone tasks"}
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </header>

      {isExpanded && (
        <div className="milestone-tasks-wrapper">
          <div className="milestone-tasks-toolbar">
            <h4>Work Packages &amp; Task Controls</h4>
            <span>{milestone.tasks.length} associated items</span>
          </div>

          <div className="table-scroll">
            <table className="milestone-task-table">
              <thead>
                <tr>
                  <th>Task / ID</th>
                  <th>Discipline</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Due Date</th>
                  <th className="num">Estimate</th>
                  <th className="num">Actual</th>
                  <th className="num">Variance</th>
                </tr>
              </thead>
              <tbody>
                {milestone.tasks.map((task) => {
                  const variance = task.cost_estimate - task.cost_actual;
                  const evidence = getTaskEvidence(task);
                  const isTaskExpanded = expandedTaskId === task.id;

                  return (
                    <React.Fragment key={task.id}>
                      <tr>
                        <td>
                          <strong>{task.title}</strong>
                          <div className="task-subrow">
                            <small className="task-id-badge">{task.id}</small>
                            <button
                              type="button"
                              className="task-source-toggle"
                              aria-expanded={isTaskExpanded}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleTaskEvidence(task.id);
                              }}
                            >
                              <ChevronDown size={13} aria-hidden="true" />
                              Expand source
                            </button>
                          </div>
                        </td>
                        <td>
                          <Tag type="warm-gray" size="sm">{task.discipline}</Tag>
                        </td>
                        <td>
                          <StatusTag status={task.status} />
                        </td>
                        <td>{task.owner}</td>
                        <td className="due-col">{task.due_date || "—"}</td>
                        <td className="num">{money(task.cost_estimate)}</td>
                        <td className="num">{money(task.cost_actual)}</td>
                        <td className={`num ${variance < 0 ? "overrun" : "underrun"}`}>
                          {money(variance)}
                        </td>
                      </tr>
                      {isTaskExpanded && <TaskEvidence evidence={evidence} />}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </article>
  );
}

export default function MilestoneSection({ project, initialView = "all" }) {
  const currentPhase = project?.phase || "Construction";
  const milestones = getProjectMilestones(project);

  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(() =>
    milestones.reduce((acc, m) => ({ ...acc, [m.id]: true }), {})
  );
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const totalTasks = milestones.reduce((sum, m) => sum + m.tasks.length, 0);
  const completedMilestonesCount = milestones.filter((m) => m.status === "Complete").length;

  const toggleGroup = (id) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleTaskEvidence = (taskId) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const filteredMilestones = milestones
    .filter((m) => !selectedMilestoneId || m.id === selectedMilestoneId)
    .filter((m) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const matchMilestone = m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
      const matchTask = m.tasks.some(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.owner.toLowerCase().includes(q) ||
          t.discipline.toLowerCase().includes(q)
      );
      return matchMilestone || matchTask;
    });

  return (
    <div className="milestone-section-container">
      {/* 1. Page Header with Current Phase Banner */}
      <div className="milestone-page-header">
        <div>
          <span className="section-kicker">PROJECT DELIVERY &amp; CONTROLS</span>
          <h1>Milestones &amp; Task controls</h1>
          <p>
            Track stage gate progression and work package task controls for the active phase.
          </p>
        </div>
      </div>

      {/* Current Phase Highlight Banner */}
      <section className="current-phase-banner" aria-label="Active Project Phase">
        <div className="current-phase-info">
          <span className="phase-pill-kicker">CURRENT PHASE</span>
          <div className="phase-title-row">
            <h2>{currentPhase}</h2>
            <Tag type="blue" size="sm">Active Delivery</Tag>
          </div>
          <p>
            Overall phase progression: <strong>{project?.progress || 62}%</strong> completed.
            Monitoring {milestones.length} milestone gates across {totalTasks} work packages.
          </p>
        </div>

        <div className="phase-stats-grid">
          <div className="phase-stat-card">
            <span>Current Phase Gates</span>
            <strong>{completedMilestonesCount} / {milestones.length}</strong>
            <small>Milestones closed</small>
          </div>
          <div className="phase-stat-card">
            <span>Work Packages</span>
            <strong>{totalTasks}</strong>
            <small>Active task controls</small>
          </div>
          <div className="phase-stat-card">
            <span>Active Blocker</span>
            <strong className="blocker-count">
              {milestones.filter((m) => m.status === "Blocked").length}
            </strong>
            <small>Critical items flagged</small>
          </div>
        </div>
      </section>

      {/* 2. Milestone Progression Stepper (Replaces Phase Progression) */}
      <MilestoneRail
        project={project}
        milestones={milestones}
        selectedMilestoneId={selectedMilestoneId}
        onSelectMilestone={setSelectedMilestoneId}
      />

      {/* 3. Grouped Milestone Cards with Nested Task Tables & Evidence */}
      <section className="milestone-groups-list" aria-label="Milestones and Task Controls">
        {filteredMilestones.length > 0 ? (
          filteredMilestones.map((milestone) => (
            <MilestoneGroupCard
              key={milestone.id}
              milestone={milestone}
              isExpanded={!!expandedGroups[milestone.id]}
              onToggleExpand={() => toggleGroup(milestone.id)}
              expandedTaskId={expandedTaskId}
              onToggleTaskEvidence={toggleTaskEvidence}
            />
          ))
        ) : (
          <div className="empty-milestones-state">
            <AlertCircle size={28} />
            <h3>No milestones or tasks found</h3>
            <p>Try clearing your search query or selecting "All Milestones".</p>
            <Button kind="tertiary" size="sm" onClick={() => { setSearchQuery(""); setSelectedMilestoneId(null); }}>
              Reset filters
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
