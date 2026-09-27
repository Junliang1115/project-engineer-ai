import React, { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  Mail,
} from "lucide-react";
import { Tag, Button, StatusTag, money } from "./ProjectTokens.jsx";
import Rail, { MilestoneRail } from "./Rail.jsx";
export { MilestoneRail, Rail };

// Milestone data fetching
export function getProjectMilestones(project) {
  if (!project?.milestones || project.milestones.length === 0) {
    return [];
  }

  return project.milestones.map((m) => ({
    id: m.id,
    name: m.name,
    phase: m.phase || project.phase,
    status: m.status,
    progress: m.progress ?? 0,
    forecastDate: m.forecastDate || m.due_date || "",
    plannedAmount: m.plannedAmount || 0,
    actualAmount: m.actualAmount || 0,
    variance: m.variance || "",
    description: m.description || "",
    blocker: m.blocker || null,
    tasks: m.tasks || [],
  }));
}

// Task Activity Log fetching
export function getTaskLog(task) {
  if (!task) return [];

  // Collect real activities attached to this task via the foreign key (task_id):
  const taskActivities = Array.isArray(task.activities) ? [...task.activities] : [];

  // Sort latest first (most recent timestamp at top):
  taskActivities.sort((a, b) => {
    const parseTime = (val) => (val ? Date.parse(val.replace(" ", "T")) : 0);
    return parseTime(b.received) - parseTime(a.received);
  });

  return taskActivities.map((act) => {
    const rawSource = act.sourceType || act.source || act.source_type || "email";
    const formattedSource = rawSource
      ? rawSource.charAt(0).toUpperCase() + rawSource.slice(1)
      : "";

    return {
      id: act.id,
      title: act.title,
      sourceType: formattedSource,
      sourceOwner: act.from || act.sourceOwner || "",
      sourceDate: act.received || act.sourceDate || "",
      confidence: act.state === "applied" ? "Applied" : act.state === "needs_review" ? "Needs Review" : "Logged",
      summary: act.summary,
    };
  });
}

// Task Activity Log Panel
export function TaskLog({ logs, evidence, task }) {
  const activities = Array.isArray(logs) ? logs : Array.isArray(evidence) ? evidence : [];

  return (
    <tr className="task-source-row">
      <td colSpan="9">
        <div className="task-source-panel">
          <div className="task-source-heading">
            <Mail size={17} aria-hidden="true" />
            <div>
              <strong>Task log</strong>
              <span style={{ marginLeft: "8px", fontSize: "11px", color: "rgba(255, 255, 255, 0.45)" }}>
                Source evidence
              </span>
            </div>
          </div>

          {task?.remark && (
            <p style={{ paddingBottom: "10px", borderBottom: "1px dashed rgba(255,255,255,0.1)" }}>
              <span>Task remark</span>
              {task.remark}
            </p>
          )}

          {activities.length > 0 ? (
            <div className="task-activities-stream" style={{ display: "grid", gap: "12px" }}>
              {activities.map((act, index) => (
                <div
                  key={act.id || index}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    background: index === 0 ? "rgba(231, 166, 59, 0.06)" : "#151917",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#f3f4f4" }}>
                      #{index + 1} {act.title}
                    </span>
                    {index === 0 && (
                      <span
                        style={{
                          fontSize: "10px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "rgba(231, 166, 59, 0.2)",
                          color: "var(--accent, #e7a63b)",
                          fontWeight: "600",
                        }}
                      >
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="source-evidence-grid">
                    <div>
                      <span>Source type</span>
                      <strong>{act.sourceType}</strong>
                    </div>
                    <div>
                      <span>Owner / sender</span>
                      <strong>{act.sourceOwner}</strong>
                    </div>
                    <div>
                      <span>Received</span>
                      <strong>{act.sourceDate}</strong>
                    </div>
                    <div>
                      <span>Status signal</span>
                      <strong>{act.confidence}</strong>
                    </div>
                  </div>
                  {act.summary && (
                    <p style={{ marginTop: "8px" }}>
                      <span>Summary</span>
                      {act.summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p style={{ marginTop: "8px" }}>
                <span>Validation note</span>
                " "
              </p>
            </div>
          )}
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
  onToggleTaskLog,
}) {
  const handleToggleTaskLog = onToggleTaskLog;
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
          {milestone.description && <p className="milestone-desc">{milestone.description}</p>}
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
                  <th style={{ width: "36px" }}></th>
                </tr>
              </thead>
              <tbody>
                {milestone.tasks.map((task) => {
                  const variance = task.cost_estimate - task.cost_actual;
                  const taskLogs = getTaskLog(task);
                  const isTaskExpanded = expandedTaskId === task.id;

                  return (
                    <React.Fragment key={task.id}>
                      <tr
                        className={`task-row ${isTaskExpanded ? "is-expanded" : ""}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => handleToggleTaskLog(task.id)}
                      >
                        <td>
                          <strong>{task.title}</strong>
                          <div className="task-subrow">
                            <small className="task-id-badge">{task.id}</small>
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
                        <td className="task-action-cell" style={{ textAlign: "right", verticalAlign: "middle" }}>
                          <button
                            type="button"
                            className="task-source-toggle"
                            aria-label={isTaskExpanded ? "Collapse source" : "Expand source"}
                            title={isTaskExpanded ? "Collapse source log" : "Expand source log"}
                            aria-expanded={isTaskExpanded}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTaskLog(task.id);
                            }}
                          >
                            <ChevronDown size={15} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                      {isTaskExpanded && <TaskLog logs={taskLogs} evidence={taskLogs} task={task} />}
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

  const toggleTaskLog = (taskId) => {
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
              onToggleTaskLog={toggleTaskLog}
              project={project}
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
