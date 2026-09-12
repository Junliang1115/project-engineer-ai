import React, { useMemo, useState } from "react";
import { PanelLeftOpen, Search, X, RotateCcw } from "lucide-react";
import "./LessonsPage.css";

const lessons = [
  {
    id: "LL-001",
    project: "Harbor Link Station",
    phase: "Construction",
    category: "Piping",
    event: "Pipe wall thickness was below the approved specification during receiving inspection.",
    rootCause: "Vendor certificate was accepted before the latest material requisition revision was checked.",
    lesson: "Material acceptance needs a drawing, requisition and certificate match before release to site.",
    action: "Add a receiving checklist step for wall thickness, heat number and revision match before installation release.",
  },
  {
    id: "LL-002",
    project: "Harbor Link Station",
    phase: "Procurement",
    category: "Vendor Document",
    event: "Pump package drawing arrived after civil foundation hold points were already planned.",
    rootCause: "Vendor document schedule was not tied to the construction work pack baseline.",
    lesson: "Long-lead package documents must drive field planning dates, not only purchase order dates.",
    action: "Link vendor drawing approval dates to milestone readiness and flag late documents in weekly progress review.",
  },
  {
    id: "LL-003",
    project: "Tower B Facade",
    phase: "Design",
    category: "Interface",
    event: "Cable tray route conflicted with access platform clearance.",
    rootCause: "Discipline models were reviewed separately without an interface freeze before fabrication.",
    lesson: "Design review should focus on maintainability and access space before fabrication drawings are issued.",
    action: "Run an interface review for access, lifting and maintenance clearance before construction release.",
  },
  {
    id: "LL-004",
    project: "Prime Estate Podium",
    phase: "Commissioning",
    category: "Testing",
    event: "Pressure test package was rejected because calibration certificates were expired.",
    rootCause: "Test equipment validity was checked at execution instead of during test pack preparation.",
    lesson: "Test readiness must include tool and instrument validity, not only procedure approval.",
    action: "Add calibration status to test pack readiness checks and assign QA verification before test day.",
  },
];

export default function LessonRegister({ projects, sidebarOpen, onExpandSidebar }) {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState("All phases");
  const [category, setCategory] = useState("All categories");
  const [project, setProject] = useState("All projects");

  const projectOptions = useMemo(() => {
    const names = [...new Set([...lessons.map((item) => item.project), ...(projects || []).map((item) => item.name)])];
    return names.filter(Boolean);
  }, [projects]);
  const phaseOptions = useMemo(() => [...new Set(lessons.map((item) => item.phase))], []);
  const categoryOptions = useMemo(() => [...new Set(lessons.map((item) => item.category))], []);

  const isFiltered =
    query.trim() !== "" ||
    phase !== "All phases" ||
    category !== "All categories" ||
    project !== "All projects";

  const handleReset = () => {
    setQuery("");
    setPhase("All phases");
    setCategory("All categories");
    setProject("All projects");
  };

  const visible = lessons.filter((item) => {
    const matchesProject = project === "All projects" || item.project === project;
    const matchesPhase = phase === "All phases" || item.phase === phase;
    const matchesCategory = category === "All categories" || item.category === category;
    const matchesSearch = Object.values(item)
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    return matchesProject && matchesPhase && matchesCategory && matchesSearch;
  });

  return (
    <section className="lessons-page">
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
              {visible.length} of {lessons.length} lessons
            </span>
          </div>
          <p>Project engineering experience captured for future work packs</p>
        </div>
      </header>

      <div className="lessons-toolbar">
        <label className="lessons-search">
          <Search size={13} className="search-icon" />
          <input
            aria-label="Search lesson learned register"
            placeholder="Search lesson, event, cause, or action..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              className="lessons-search-clear"
              onClick={() => setQuery("")}
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </label>
        <select
          aria-label="Filter by project"
          value={project}
          onChange={(event) => setProject(event.target.value)}
        >
          <option>All projects</option>
          {projectOptions.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <select
          aria-label="Filter by project phase"
          value={phase}
          onChange={(event) => setPhase(event.target.value)}
        >
          <option>All phases</option>
          {phaseOptions.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option>All categories</option>
          {categoryOptions.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        {isFiltered && (
          <button
            type="button"
            className="lessons-reset-btn"
            onClick={handleReset}
            title="Reset all filters"
          >
            <RotateCcw size={11} />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="lessons-table-wrap">
        <table className="lessons-table">
          <thead>
            <tr>
              <th style={{ width: "95px" }}>ID</th>
              <th style={{ width: "110px" }}>Project Phase</th>
              <th style={{ width: "110px" }}>Category</th>
              <th style={{ width: "18%" }}>Event</th>
              <th style={{ width: "18%" }}>Root Cause</th>
              <th style={{ width: "23%" }}>Lesson Learned</th>
              <th style={{ width: "19%" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="lesson-id-badge">{item.id}</span>
                  <small className="lesson-project-sub" title={item.project}>
                    {item.project}
                  </small>
                </td>
                <td>
                  <span className="lesson-phase-pill">{item.phase}</span>
                </td>
                <td>
                  <span className="lesson-cat-pill">{item.category}</span>
                </td>
                <td className="lesson-event-cell">{item.event}</td>
                <td className="lesson-root-cell">{item.rootCause}</td>
                <td className="lesson-learned-cell">
                  <strong>{item.lesson}</strong>
                </td>
                <td className="lesson-action-cell">{item.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && (
        <div className="lessons-empty">
          <p>No matching lessons found for current filter criteria.</p>
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
      )}
    </section>
  );
}
