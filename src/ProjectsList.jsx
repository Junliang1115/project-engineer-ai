import React, { useState, useEffect } from "react";
import {
  AlertTriangle as Warning,
  ArrowRight,
  Building2 as Buildings,
  Layers,
  RotateCw,
} from "lucide-react";
import { Tag } from "./components/Tag.jsx";
import { Button } from "./components/Button.jsx";
import { Progress } from "./components/Progress.jsx";
import { SearchBar } from "./components/SearchBar.jsx";

export function LoadingState() {
  return (
    <main className="page">
      <div className="skeleton-title" />
      <div className="skeleton-grid">
        {[1, 2, 3].map((x) => (
          <div className="skeleton-card" key={x} />
        ))}
      </div>
    </main>
  );
}

function getProjectRiskStats(project) {
  const issues = project.issues || [];
  const openRisks = issues.filter(
    (i) => i.severity !== "Learning" && (i.status || "").toLowerCase() !== "closed"
  );
  const highRisks = openRisks.filter(
    (i) => i.severity === "High" || i.severity === "Critical"
  );
  return {
    openCount: openRisks.length,
    highCount: highRisks.length,
    allCount: issues.length,
  };
}

function isProjectActive(project) {
  const phase = (project.phase || "").toLowerCase();
  const isFinished = phase === "handover" && (project.progress >= 100 || project.progress == null);
  const isClosed = phase === "closed" || phase === "completed";
  return !isFinished && !isClosed;
}

export function ProjectsList({ projects, onSelectProject, onRefreshProjects, lastUpdated, isScanning }) {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'active' | 'high-risk'

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 260);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <LoadingState />;

  const formatLastUpdated = (dateStr) => {
    if (!dateStr) return "Recently";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const activeProjectsCount = projects.filter(isProjectActive).length;
  const openHighRiskCount = projects.reduce(
    (sum, p) => sum + getProjectRiskStats(p).highCount,
    0
  );

  const filtered = projects
    .filter((p) => {
      if (activeFilter === "active") return isProjectActive(p);
      if (activeFilter === "high-risk") return getProjectRiskStats(p).highCount > 0;
      return true;
    })
    .filter((p) =>
      `${p.name} ${p.phase} ${p.id}`.toLowerCase().includes(query.toLowerCase())
    );

  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <p className="kicker">PROJECT OVERVIEW</p>
          <h1>Project Profiles</h1>
          <p>Monitor phase position, delivery progress, cost exposure, and active project controls.</p>
        </div>
        <div className="heading-meta" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span>Updated {formatLastUpdated(lastUpdated)}</span>
          {onRefreshProjects && (
            <button
              type="button"
              className="refresh-scan-button"
              onClick={onRefreshProjects}
              disabled={isScanning}
              title="Scan Gmail and refresh project data"
              aria-label="Scan Gmail and refresh project data"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.65rem",
                fontSize: "0.78rem",
                fontWeight: "600",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "6px",
                color: "var(--text)",
                cursor: isScanning ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <RotateCw size={14} className={isScanning ? "spin-icon" : ""} />
              <span>{isScanning ? "Scanning..." : "Refresh"}</span>
            </button>
          )}
        </div>
      </div>

      <section className="metrics" aria-label="Portfolio summary" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeFilter === "all"}
          className={`metric-tab ${activeFilter === "all" ? "active" : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          <Layers size={20} />
          <span>All Projects</span>
          <strong>{projects.length}</strong>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeFilter === "active"}
          className={`metric-tab ${activeFilter === "active" ? "active" : ""}`}
          onClick={() => setActiveFilter("active")}
        >
          <Buildings size={20} />
          <span>Active Projects</span>
          <strong>{activeProjectsCount}</strong>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeFilter === "high-risk"}
          className={`metric-tab metric-high-risk ${activeFilter === "high-risk" ? "active" : ""}`}
          onClick={() => setActiveFilter("high-risk")}
        >
          <Warning size={20} />
          <span>Open High Risk</span>
          <strong>{openHighRiskCount}</strong>
        </button>
      </section>

      <div className="list-toolbar">
        <div>
          <h2>Project register</h2>
          <span>
            {filtered.length} records
            {activeFilter === "active" && " · Active"}
            {activeFilter === "high-risk" && " · High Risk"}
          </span>
        </div>
        <SearchBar
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder="Search project, phase, or ID"
          ariaLabel="Search projects"
        />
      </div>

      {filtered.length ? (
        <section className="project-grid">
          {filtered.map((project) => {
            const { openCount, highCount } = getProjectRiskStats(project);

            return (
              <article
                className="project-card clickable"
                role="button"
                tabIndex={0}
                onClick={() => onSelectProject(project.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectProject(project.id);
                  }
                }}
                key={project.id}
                aria-label={`Open Project: ${project.name}`}
              >
                <div className="card-top">
                  <span className="project-id technical-id">{project.id}</span>
                  <Tag type="warm-gray" size="sm">
                    {project.phase}
                  </Tag>
                </div>
                <h3>{project.name}</h3>
                <div className="card-finance">
                  <div>
                    <span>Approved budget</span>
                    <strong>${project.budget}M</strong>
                  </div>
                  <div className="card-risk-stat">
                    <span>Risk issues</span>
                    <strong className={highCount > 0 ? "high-risk-val" : ""}>
                      {openCount} {highCount > 0 ? <small>({highCount} high)</small> : <small>open</small>}
                    </strong>
                  </div>
                  <ArrowRight size={20} />
                </div>
                <Progress value={project.progress} />
              </article>
            );
          })}
        </section>
      ) : (
        <section className="empty">
          <MagnifyingGlass size={28} />
          <h2>No projects found</h2>
          <p>
            {activeFilter !== "all"
              ? "No projects match the selected filter and search criteria."
              : "Adjust the search term to view matching project profiles."}
          </p>
          {(query || activeFilter !== "all") && (
            <Button
              kind="tertiary"
              size="sm"
              onClick={() => {
                setQuery("");
                setActiveFilter("all");
              }}
            >
              Reset filters
            </Button>
          )}
        </section>
      )}
    </main>
  );
}

export default ProjectsList;

