import React from "react";
import { ChevronDown } from "lucide-react";
import "./ProjectOverview.css";

export function getControls(project) {
  const task = (project.tasks && project.tasks.find((item) => item.status === "In progress")) || project.tasks?.[0] || { id: "TSK-101", owner: "Project lead" };
  const actual = (project.costs || []).reduce((sum, phase) => sum + (phase.actual || 0), 0);
  const remaining = Math.max(0, (project.budget || 0) - actual);
  return {
    task,
    actual,
    committed: remaining * 0.7,
    forecast: Math.max(project.budget || 0, actual) + (project.budget || 0) * 0.04,
    pending: (project.budget || 0) * 0.015,
  };
}

export function Source({ project, title, sender, body }) {
  return (
    <details className="control-source">
      <summary>View source</summary>
      <div>
        <strong>{title}</strong>
        <p>{sender} · {project?.id} · 11 Sep 2026</p>
        <p>{body}</p>
        <small>Mock source · Awaiting engineer validation</small>
      </div>
    </details>
  );
}

export function SharedDetailPanel({
  isOpen,
  onToggle,
  title,
  badges = [],
  sections = [],
}) {
  return (
    <div className="shared-detail-wrapper">
      <button
        type="button"
        className={`shared-detail-toggle-btn ${isOpen ? "is-active" : ""}`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span>{isOpen ? "Hide details" : "More details"}</span>
        <ChevronDown size={14} className="toggle-arrow" />
      </button>

      {isOpen && (
        <div className="shared-detail-container risk-reasoning-card">
          <div className="shared-detail-header risk-reasoning-aside">
            <span className="shared-detail-header-title">{title}</span>
            <div className="shared-detail-badges">
              {badges.map((b, idx) => (
                <span key={idx} className="shared-detail-badge">
                  <span className="badge-k">{b.label}:</span>
                  <span className="badge-v">{b.value}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="shared-detail-grid risk-reasoning-main">
            {sections.map((sec, idx) => (
              <div key={idx} className="shared-detail-card">
                <div className="shared-detail-card-head">
                  <span className="shared-detail-label">{sec.label}</span>
                </div>
                <div className="shared-detail-card-content">
                  {sec.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
