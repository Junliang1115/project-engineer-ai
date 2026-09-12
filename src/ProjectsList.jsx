import React, { useState, useEffect } from "react";
import {
  AlertTriangle as Warning,
  ArrowRight,
  BarChart2 as ChartBar,
  Building2 as Buildings,
  DollarSign as CurrencyDollar,
  Search as MagnifyingGlass,
} from "lucide-react";
import { projects } from "./data.js";
import { Tag, Button, Progress } from "./ProjectTokens.jsx";

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

export function ProjectsList({ onSelectProject }) {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 260);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <LoadingState />;

  const filtered = projects.filter((p) =>
    `${p.name} ${p.phase} ${p.id}`.toLowerCase().includes(query.toLowerCase())
  );
  const committed = projects.reduce((sum, p) => sum + p.budget, 0);
  const avg = Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length);
  const openHighCount = projects.reduce(
    (n, p) => n + p.issues.filter((i) => i.severity === "High" && i.status !== "Closed").length,
    0
  );

  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <p className="kicker">PROJECT OVERVIEW</p>
          <h1>Capital projects</h1>
          <p>Monitor phase position, delivery progress, cost exposure, and active project controls.</p>
        </div>
        <div className="heading-meta">
          Updated 01 Sep 2026<br />Reporting cycle 09
        </div>
      </div>

      <section className="metrics" aria-label="Portfolio summary">
        <div>
          <Buildings size={20} />
          <span>Active projects</span>
          <strong>{projects.length}</strong>
        </div>
        <div>
          <CurrencyDollar size={20} />
          <span>Approved budget</span>
          <strong>${committed}M</strong>
        </div>
        <div>
          <ChartBar size={20} />
          <span>Mean progress</span>
          <strong>{avg}%</strong>
        </div>
        <div>
          <Warning size={20} />
          <span>Open high issues</span>
          <strong>{openHighCount}</strong>
        </div>
      </section>

      <div className="list-toolbar">
        <div>
          <h2>Project register</h2>
          <span>{filtered.length} records</span>
        </div>
        <label className="search">
          <MagnifyingGlass size={17} />
          <span className="sr-only">Search projects</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search project, phase, or ID"
          />
        </label>
      </div>

      {filtered.length ? (
        <section className="project-grid">
          {filtered.map((project) => (
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
                <span className="project-id">{project.id}</span>
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
                <ArrowRight size={20} />
              </div>
              <Progress value={project.progress} />
            </article>
          ))}
        </section>
      ) : (
        <section className="empty">
          <MagnifyingGlass size={28} />
          <h2>No projects found</h2>
          <p>Adjust the search term to view matching capital projects.</p>
          <Button kind="tertiary" size="sm" onClick={() => setQuery("")}>
            Clear search
          </Button>
        </section>
      )}
    </main>
  );
}

export default ProjectsList;
