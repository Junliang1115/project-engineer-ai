import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronDown, AlertCircle, Mail } from "lucide-react";
import { Tag, Button, StatusTag, money } from "./ProjectTokens.jsx";
import Rail, { MilestoneRail } from "./Rail.jsx";
export { MilestoneRail, Rail };

// Helper to determine the current active milestone gate
export function getActiveMilestone(milestones) {
  if (!Array.isArray(milestones) || milestones.length === 0) return null;

  // 1. Look for milestone explicitly in progress or active
  const inProgress = milestones.find((m) => {
    const s = (m.status || "").toLowerCase();
    return s === "in progress" || s === "active";
  });
  if (inProgress) return inProgress;

  // 2. Look for first non-completed milestone (e.g. Blocked or upcoming)
  const pending = milestones.find((m) => {
    const s = (m.status || "").toLowerCase();
    return s !== "complete" && s !== "completed";
  });
  if (pending) return pending;

  // 3. Fallback to first milestone
  return milestones[0];
}

// Milestone data fetching
export function getProjectMilestones(project) {
  if (!project?.milestones || project.milestones.length === 0) {
    return [];
  }

  const allProjectTasks = Array.isArray(project.tasks) ? project.tasks : [];

  return project.milestones.map((m) => {
    let tasks = Array.isArray(m.tasks) && m.tasks.length > 0 ? m.tasks : [];
    if (tasks.length === 0 && allProjectTasks.length > 0) {
      tasks = allProjectTasks.filter((t) => {
        if (t.milestone_id && (t.milestone_id === m.id || t.milestone_id === m.milestone_id)) return true;
        if (t.due_date && m.forecastDate && t.due_date === m.forecastDate) return true;
        return false;
      });
      if (tasks.length === 0 && m.id === "M-04") {
        tasks = allProjectTasks.filter((t) => t.id === "TSK-103");
      }
    }

    return {
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
      tasks,
    };
  });
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
  expandedTaskId,
  onToggleTaskLog,
}) {
  const handleToggleTaskLog = onToggleTaskLog;

  return (
    <article className="milestone-group-card" id={`milestone-${milestone.id}`}>
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
                  <th style={{ width: "120px", textAlign: "right" }}>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {milestone.tasks.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                      No work package tasks logged for this milestone yet.
                    </td>
                  </tr>
                ) : (
                  milestone.tasks.map((task) => {
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
                              <ChevronDown size={14} aria-hidden="true" />
                              <span>{isTaskExpanded ? "Hide source" : "Expand source"}</span>
                            </button>
                          </td>
                        </tr>
                        {isTaskExpanded && <TaskLog logs={taskLogs} evidence={taskLogs} task={task} />}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
    </article>
  );
}

export default function MilestoneSection({ project, initialView = "active" }) {
  const milestones = getProjectMilestones(project);
  const activeMilestone = useMemo(() => getActiveMilestone(milestones), [milestones]);

  // Default to showing only current active milestone tasks (instead of all milestones)
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(() => {
    if (initialView === "all") return "ALL";
    return activeMilestone ? activeMilestone.id : null;
  });

  const [expandedTaskId, setExpandedTaskId] = useState(null);

  // Sync if project changes or if milestones load asynchronously
  const prevProjectIdRef = useRef(project?.id);
  useEffect(() => {
    if (project?.id !== prevProjectIdRef.current) {
      prevProjectIdRef.current = project?.id;
      if (initialView !== "all") {
        setSelectedMilestoneId(activeMilestone ? activeMilestone.id : null);
      }
    } else if (selectedMilestoneId === null && activeMilestone && initialView !== "all") {
      setSelectedMilestoneId(activeMilestone.id);
    }
  }, [project?.id, activeMilestone, selectedMilestoneId, initialView]);

  const toggleTaskLog = (taskId) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const isShowingAll = !selectedMilestoneId || selectedMilestoneId === "ALL";

  // Filter tasks purely based on the milestone progression selection
  const filteredMilestones = milestones.filter(
    (m) => isShowingAll || m.id === selectedMilestoneId
  );

  return (
    <div className="milestone-section-container">
      {/* 1. Page Header */}
      <div className="milestone-page-header">
        <div>
          <span className="section-kicker">PROJECT DELIVERY &amp; CONTROLS</span>
          <h1>Milestones &amp; Task controls</h1>
        </div>
      </div>

      {/* 2. Milestone Progression Stepper (Controls milestone task filtering) */}
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
              expandedTaskId={expandedTaskId}
              onToggleTaskLog={toggleTaskLog}
              project={project}
            />
          ))
        ) : (
          <div className="empty-milestones-state">
            <AlertCircle size={28} />
            <h3>No milestones found</h3>
            <p>Select a milestone gate from the progression stepper above or click Show all.</p>
            <Button
              kind="tertiary"
              size="sm"
              onClick={() => {
                setSelectedMilestoneId(activeMilestone ? activeMilestone.id : "ALL");
              }}
            >
              Reset to active milestone
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
