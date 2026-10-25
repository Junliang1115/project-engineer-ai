import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronDown, AlertCircle, Mail } from "lucide-react";
import { Tag, StatusTag } from "../../../components/Tag.jsx";
import { Button } from "../../../components/Button.jsx";
import { FilterBar, FilterSelect } from "../../../components/FilterBar.jsx";

const money = (value, compact = false) =>
  compact
    ? `$${value.toFixed(value % 1 ? 1 : 0)}M`
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
import Rail from "../../../components/Rail.jsx";
import { DetailPanel } from "../../../components/DetailPanel.jsx";
export { Rail, DetailPanel };

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
    return s !== "completed";
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
        if (
          t.milestone_id &&
          (t.milestone_id === m.id || t.milestone_id === m.milestone_id)
        )
          return true;
        if (t.due_date && m.forecastDate && t.due_date === m.forecastDate)
          return true;
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
  const taskActivities = Array.isArray(task.activities)
    ? [...task.activities]
    : [];

  // Sort latest first (most recent timestamp at top):
  taskActivities.sort((a, b) => {
    const parseTime = (val) => (val ? Date.parse(val.replace(" ", "T")) : 0);
    return parseTime(b.received) - parseTime(a.received);
  });

  return taskActivities.map((act) => {
    const rawSource =
      act.sourceType || act.source || act.source_type || "email";
    const formattedSource = rawSource
      ? rawSource.charAt(0).toUpperCase() + rawSource.slice(1)
      : "";

    return {
      id: act.id,
      title: act.title,
      sourceType: formattedSource,
      sourceOwner: act.from || act.sourceOwner || "",
      sourceDate: act.received || act.sourceDate || "",
      confidence:
        act.state === "applied"
          ? "Applied"
          : act.state === "needs_review"
            ? "Needs Review"
            : "Logged",
      summary: act.summary,
    };
  });
}

// Task Activity Log Panel — using unified DetailPanel template
export function TaskLog({ logs, evidence, task, project }) {
  const activities = Array.isArray(logs)
    ? logs
    : Array.isArray(evidence)
      ? evidence
      : [];

  return (
    <tr className="task-source-row">
      <td colSpan="8" style={{ textAlign: "left" }}>
        <DetailPanel
          as="div"
          showToggle={false}
          title="Task log"
          subtitle="Source evidence"
          remark={task?.remark}
          evidence={activities}
          project={project}
        />
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
                <th>Status</th>
                <th>Owner</th>
                <th>Due Date</th>
                <th className="num">Estimate</th>
                <th className="num">Actual</th>
                <th className="num">Variance</th>
                <th
                  style={{ width: "44px", textAlign: "right" }}
                  aria-label="Details"
                  title="Source evidence"
                ></th>
              </tr>
            </thead>
            <tbody>
              {milestone.tasks.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      textAlign: "center",
                      padding: "24px",
                      color: "var(--muted)",
                    }}
                  >
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
                            <small className="task-id-badge technical-id">
                              {task.id}
                            </small>
                          </div>
                        </td>
                        <td>
                          <StatusTag status={task.status} />
                        </td>
                        <td>{task.owner}</td>
                        <td className="due-col">{task.due_date || "—"}</td>
                        <td className="num">{money(task.cost_estimate)}</td>
                        <td className="num">{money(task.cost_actual)}</td>
                        <td
                          className={`num ${variance < 0 ? "overrun" : "underrun"}`}
                        >
                          {money(variance)}
                        </td>
                        <td
                          className="task-action-cell"
                          style={{
                            textAlign: "right",
                            verticalAlign: "middle",
                          }}
                        >
                          {/* Expand source / task log details toggle */}
                          <DetailPanel.Toggle
                            isOpen={isTaskExpanded}
                            onToggle={(e) => {
                              e.stopPropagation();
                              handleToggleTaskLog(task.id);
                            }}
                          />
                        </td>
                      </tr>
                      {isTaskExpanded && (
                        <TaskLog
                          logs={taskLogs}
                          evidence={taskLogs}
                          task={task}
                        />
                      )}
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

  const [selectedPhase, setSelectedPhase] = useState(project.phase);

  // Keep in sync when project changes
  useEffect(() => {
    if (project?.phase) {
      setSelectedPhase(project.phase);
    }
  }, [project?.id, project?.phase]);

  // Distinct phases available from milestones
  const availablePhases = useMemo(() => {
    const set = new Set();
    milestones.forEach((m) => {
      if (m.phase) set.add(m.phase);
    });
    return Array.from(set);
  }, [milestones, project?.phase]);

  // Filter milestones by selected phase (defaults to current project phase)
  const phaseMilestones = useMemo(() => {
    if (selectedPhase === "ALL") return milestones;
    return milestones.filter(
      (m) => (m.phase || "").toLowerCase() === selectedPhase.toLowerCase(),
    );
  }, [milestones, selectedPhase]);

  const activeMilestone = useMemo(
    () => getActiveMilestone(phaseMilestones),
    [phaseMilestones],
  );

  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null);

  const defaultMilestoneId =
    initialView === "all"
      ? "ALL"
      : activeMilestone
        ? activeMilestone.id
        : "ALL";

  // Sync selected milestone when phase changes or initially loads
  useEffect(() => {
    setSelectedMilestoneId(defaultMilestoneId);
  }, [selectedPhase, defaultMilestoneId]);

  const [expandedTaskId, setExpandedTaskId] = useState(null);

  const toggleTaskLog = (taskId) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterOwner, setFilterOwner] = useState("All");

  const phaseTasks = phaseMilestones.flatMap((m) => m.tasks);
  const uniqueSorted = (values) => [...new Set(values.filter(Boolean))].sort();
  const statusOptions = uniqueSorted(phaseTasks.map((t) => t.status));
  const ownerOptions = uniqueSorted(phaseTasks.map((t) => t.owner));

  // Status/owner options depend on the phase, so clear them when it changes
  useEffect(() => {
    setFilterStatus("All");
    setFilterOwner("All");
  }, [selectedPhase]);

  const isTaskFiltered =
    searchTerm.trim() !== "" || filterStatus !== "All" || filterOwner !== "All";
  const resetFilters = () => {
    setSearchTerm("");
    setFilterStatus("All");
    setFilterOwner("All");
    setSelectedMilestoneId(defaultMilestoneId);
  };

  const isShowingAll = !selectedMilestoneId || selectedMilestoneId === "ALL";

  // Filter tasks based on the milestone progression selection
  const selectedMilestones = phaseMilestones.filter(
    (m) => isShowingAll || m.id === selectedMilestoneId,
  );

  // Narrow each milestone's tasks by search, status and owner; hide milestones with no matches
  const query = searchTerm.trim().toLowerCase();
  const filteredMilestones = isTaskFiltered
    ? selectedMilestones
        .map((m) => ({
          ...m,
          tasks: m.tasks.filter(
            (t) =>
              (filterStatus === "All" || t.status === filterStatus) &&
              (filterOwner === "All" || t.owner === filterOwner) &&
              (!query ||
                [t.id, t.title, t.owner, t.status].some((value) =>
                  String(value || "")
                    .toLowerCase()
                    .includes(query),
                )),
          ),
        }))
        .filter((m) => m.tasks.length > 0)
    : selectedMilestones;
  const shownTaskCount = filteredMilestones.reduce(
    (sum, m) => sum + m.tasks.length,
    0,
  );

  return (
    <div>
      {/* 1. Page Header with Phase Dropdown */}
      <div className="section-page-header">
        <div>
          <h1>Milestones</h1>
          <p className="section-page-description">
            Track milestone progress, work packages, and task delivery.
          </p>
        </div>
        {availablePhases.length > 1 && (
          <div className="section-header-actions">
            <select
              id="milestone-phase-select"
              aria-label="Filter milestones by phase"
              className="section-header-select"
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
            >
              {availablePhases.map((phaseName) => {
                return (
                  <option key={phaseName} value={phaseName}>
                    {phaseName}
                  </option>
                );
              })}
              <option value="ALL">All phases</option>
            </select>
          </div>
        )}
      </div>

      {/* 2. Milestone Progression Stepper (Controls milestone task filtering) */}
      <Rail
        milestones={phaseMilestones}
        selectedMilestoneId={selectedMilestoneId}
        onSelectMilestone={setSelectedMilestoneId}
      />

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Search task title, ID or owner"
        ariaLabel="Search milestone tasks"
        onReset={resetFilters}
        canReset={
          isTaskFiltered ||
          (selectedMilestoneId || "ALL") !== defaultMilestoneId
        }
        count={shownTaskCount}
        countLabel="tasks shown"
      >
        {/* Shares state with the milestone rail: clicking a gate updates this, and vice versa */}
        <FilterSelect
          label="Filter by milestone"
          value={selectedMilestoneId || "ALL"}
          onChange={setSelectedMilestoneId}
          options={[
            { value: "ALL", label: "All milestones" },
            ...phaseMilestones.map((m) => ({
              value: m.id,
              label: m.name || m.id,
            })),
          ]}
        />
        {statusOptions.length > 1 && (
          <FilterSelect
            label="Filter tasks by status"
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: "All", label: "All statuses" },
              ...statusOptions,
            ]}
          />
        )}
        {ownerOptions.length > 1 && (
          <FilterSelect
            label="Filter tasks by owner"
            value={filterOwner}
            onChange={setFilterOwner}
            options={[{ value: "All", label: "All owners" }, ...ownerOptions]}
          />
        )}
      </FilterBar>

      {/* 3. Grouped Milestone Cards with Nested Task Tables & Evidence */}
      <section className="milestone-groups-list" aria-label="Milestones">
        {isTaskFiltered && filteredMilestones.length === 0 ? (
          <div className="empty-milestones-state">
            <AlertCircle size={28} />
            <h3>No matching tasks</h3>
            <p>
              No tasks match the current filters in the selected milestones.
            </p>
            <Button kind="tertiary" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>
        ) : filteredMilestones.length > 0 ? (
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
            <h3>No milestones for {selectedPhase}</h3>
            <p>No milestone gates have been scheduled for this phase.</p>
            <Button
              kind="tertiary"
              size="sm"
              onClick={() => {
                setSelectedPhase(project?.phase || "Construction");
              }}
            >
              Return to {project?.phase || "Construction"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
