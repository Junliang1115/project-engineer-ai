import React, { useEffect, useMemo, useState } from "react";
import { PanelLeftOpen, RotateCcw } from "lucide-react";
import { FilterBar, FilterSelect } from "../../../components/FilterBar.jsx";
import { ListTable } from "../../../components/ListTable.jsx";
import "./LessonsPage.css";

/**
 * Filter lessons scoped to a specific project.
 */
export function getProjectLessons(project) {
  if (!project) return [];
  const pId = (project.id || "").toUpperCase();
  const pName = (project.name || "").toLowerCase();

  const sourceLessons = Array.isArray(project.lessons) ? project.lessons : [];

  return sourceLessons.filter((item) => {
    const itemPid = (item.projectId || item.project_id || "").toUpperCase();
    const itemPname = (item.project || item.projectName || "").toLowerCase();
    return (
      itemPid === pId ||
      (pId === "PRJ-2401" && itemPid === "PRJ-01") ||
      (pId === "PRJ-01" && itemPid === "PRJ-2401") ||
      itemPname === pName ||
      (!itemPid && !itemPname)
    );
  });
}

export const LESSON_TABLE_COLUMNS = [
  {
    key: "id",
    title: "ID",
    width: "105px",
    render: (item) => (
      <>
        <span className="lesson-id-badge technical-id">{item.id}</span>
        {item.project && (
          <small className="lesson-project-sub" title={item.project}>
            {item.project}
          </small>
        )}
      </>
    ),
  },
  {
    key: "phase",
    title: "Project Phase",
    width: "120px",
    render: (item) => <span className="lesson-phase-pill">{item.phase}</span>,
  },
  {
    key: "category",
    title: "Category",
    width: "120px",
    render: (item) => <span className="lesson-cat-pill">{item.category}</span>,
  },
  {
    key: "event",
    title: "Event",
    width: "18%",
    className: "lesson-event-cell",
  },
  {
    key: "rootCause",
    title: "Root Cause",
    width: "18%",
    className: "lesson-root-cell",
  },
  {
    key: "lesson",
    title: "Lesson Learned",
    width: "23%",
    className: "lesson-learned-cell",
    render: (item) => <strong>{item.lesson}</strong>,
  },
  {
    key: "action",
    title: "Action",
    width: "19%",
    className: "lesson-action-cell",
  },
];

export const PROJECT_LESSON_TABLE_COLUMNS = LESSON_TABLE_COLUMNS.map((column) =>
  column.key === "id"
    ? {
        ...column,
        render: (item) => (
          <span className="lesson-id-badge technical-id">{item.id}</span>
        ),
      }
    : column
);

/**
 * Unified LessonLearned Component
 *
 * Supports two modes:
 * 1. Project Detail Mode (when `project` prop is provided):
 *    - Scoped strictly to the active project's lessons.
 *    - Renders project section header with "Lesson learned" title and count badge.
 *    - Filters by Search, Phase, and Category.
 *
 * 2. Global Register Mode (when `project` is omitted, e.g. in Chat):
 *    - Displays lessons across all projects.
 *    - Renders "Lesson Learned Register" heading with collapse/expand sidebar button.
 *    - Filters by Search, Project, Phase, and Category.
 */
export default function LessonRegister({
  project,
  projects,
  sidebarOpen,
  onExpandSidebar,
}) {
  const isProjectMode = Boolean(project);

  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState("All phases");
  const [category, setCategory] = useState("All categories");
  const [selectedProject, setSelectedProject] = useState("All projects");

  // Derive lessons directly from project / projects in props (from GET /projects)
  const baseLessons = useMemo(() => {
    if (isProjectMode) {
      return getProjectLessons(project);
    }
    return (projects || []).flatMap((p) => getProjectLessons(p));
  }, [isProjectMode, project, projects]);

  // Filter options
  const projectOptions = useMemo(() => {
    if (isProjectMode) return [];
    const names = [
      ...new Set([
        ...baseLessons.map((item) => item.project),
        ...(projects || []).map((item) => item.name),
      ]),
    ];
    return names.filter(Boolean);
  }, [isProjectMode, baseLessons, projects]);

  const phaseOptions = useMemo(
    () => [...new Set(baseLessons.map((item) => item.phase))].filter(Boolean),
    [baseLessons]
  );
  const categoryOptions = useMemo(
    () => [...new Set(baseLessons.map((item) => item.category))].filter(Boolean),
    [baseLessons]
  );

  const isFiltered =
    query.trim() !== "" ||
    phase !== "All phases" ||
    category !== "All categories" ||
    (!isProjectMode && selectedProject !== "All projects");

  const handleReset = () => {
    setQuery("");
    setPhase("All phases");
    setCategory("All categories");
    if (!isProjectMode) {
      setSelectedProject("All projects");
    }
  };

  const visible = useMemo(() => {
    return baseLessons.filter((item) => {
      const matchesProject =
        isProjectMode ||
        selectedProject === "All projects" ||
        item.project === selectedProject;
      const matchesPhase = phase === "All phases" || item.phase === phase;
      const matchesCategory =
        category === "All categories" || item.category === category;
      const matchesSearch = Object.values(item)
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      return matchesProject && matchesPhase && matchesCategory && matchesSearch;
    });
  }, [baseLessons, isProjectMode, selectedProject, phase, category, query]);

  return (
    <section className={`lessons-page ${isProjectMode ? "issues-page" : ""}`}>
      {isProjectMode ? (
        <div className="section-page-header">
          <div>
            <h1>Lesson learned</h1>
            <p className="section-page-description">
              Capture project experience, root causes, and reusable insights.
            </p>
          </div>
          <div className="section-header-actions">
            <span className="section-header-badge">{visible.length} lessons</span>
          </div>
        </div>
      ) : (
        <header className="lessons-heading">
          {!sidebarOpen && (
            <button
              type="button"
              className="lessons-expand-btn"
              onClick={onExpandSidebar}
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen size={15} />
            </button>
          )}
          <div className="lessons-heading-text">
            <div className="lessons-title-line">
              <h1>Lesson Learned Register</h1>
              <span className="lessons-count-pill">
                {visible.length} of {baseLessons.length} lessons
              </span>
            </div>
            <p>Project engineering experience captured for future work packs</p>
          </div>
        </header>
      )}

      <FilterBar
        className="lessons-toolbar"
        searchValue={query}
        onSearchChange={setQuery}
        placeholder="Search lesson, event, cause, or action..."
        ariaLabel="Search lesson learned register"
        onReset={handleReset}
        canReset={isFiltered}
      >
        {!isProjectMode && (
          <FilterSelect
            label="Filter by project"
            value={selectedProject}
            onChange={setSelectedProject}
            options={["All projects", ...projectOptions]}
          />
        )}
        <FilterSelect
          label="Filter by project phase"
          value={phase}
          onChange={setPhase}
          options={["All phases", ...phaseOptions]}
        />
        <FilterSelect
          label="Filter by category"
          value={category}
          onChange={setCategory}
          options={["All categories", ...categoryOptions]}
        />
      </FilterBar>

      <ListTable
        columns={isProjectMode ? PROJECT_LESSON_TABLE_COLUMNS : LESSON_TABLE_COLUMNS}
        data={visible}
        keyField="id"
        emptyState={
          <div className="lessons-empty">
            <p>
              {isProjectMode
                ? "No matching lessons found for this project."
                : "No matching lessons found for current filter criteria."}
            </p>
            {isFiltered && (
              <button
                type="button"
                className="lessons-empty-reset"
                onClick={handleReset}
              >
                <RotateCcw size={12} /> Clear all filters
              </button>
            )}
          </div>
        }
      />
    </section>
  );
}
