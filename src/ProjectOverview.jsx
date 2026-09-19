import React from "react";
import { Tag, Progress } from "./ProjectTokens.jsx";
import Rail from "./Rail.jsx";
import { CostChart, CostOutlook } from "./CostAnalysis.jsx";
import RiskControls from "./RiskSection.jsx";
import ChangeOrderControls from "./ChangeOrderSection.jsx";
import { getControls, Source } from "./SharedControls.jsx";
import "./ProjectOverview.css";

export function AttentionControls({ project }) {
  const { task } = getControls(project);
  const items = [
    [
      "Change approval",
      "Review revised installation scope",
      "Commercial lead",
      "15 Sep",
      "Pending",
      "Client email: please assess the revised scope and submit the cost and schedule impact before approval.",
    ],
    [
      "Technical query",
      "Confirm drawing revision before release",
      task?.owner || "Piping lead",
      "10 Sep",
      "Overdue",
      `Engineering message: confirm the approved drawing revision for ${task?.id || "TSK-101"} before releasing the work package.`,
    ],
    [
      "Safety review",
      "Close outstanding hazard-review action",
      "Process safety lead",
      "11 Sep",
      "Overdue",
      "Review minutes: submit the outstanding hazard assessment evidence for authorised review before the readiness gate.",
    ],
  ];

  return (
    <section className="control-section">
      <div className="section-head">
        <h2>Needs attention</h2>
        <span>3 decisions · 2 overdue</span>
      </div>
      {items.map(([type, title, owner, due, status, body]) => (
        <article className="control-item" key={type}>
          <div>
            <span className="control-label">{type}</span>
            <h3>{title}</h3>
            <p>
              {owner} · Due {due} 2026
            </p>
          </div>
          <div>
            <span className={`control-status ${status === "Overdue" ? "is-late" : ""}`}>
              {status}
            </span>
            <Source project={project} title={title} sender={owner} body={body} />
          </div>
        </article>
      ))}
    </section>
  );
}

/**
 * ProjectOverview
 * Calls and composes the Overview view from separate modules:
 * - Header with Project ID, Phase Tag, and Overall Progress
 * - Progression Rail (from Rail.jsx)
 * - Cost Chart (from CostAnalysis.jsx)
 * - Attention Controls (Needs attention)
 * - Risk Controls (from RiskSection.jsx)
 */
export function ProjectOverview({ project, onExploreMore }) {
  return (
    <div className="project-overview-content">
      <div className="detail-heading">
        <div>
          <div className="title-line">
            <span>{project.id}</span>
            <Tag type="warm-gray" size="sm">
              {project.phase}
            </Tag>
          </div>
          <h1>{project.name}</h1>
          <p>
            Current milestone: Work package release · Forecast 23 Sep 2026 · Mock data
          </p>
        </div>
        <div className="detail-progress">
          <strong>{project.progress}%</strong>
          <span>Overall progress</span>
          <Progress value={project.progress} label={false} />
        </div>
      </div>

      <Rail project={project} />
      <CostChart project={project} onExploreMore={onExploreMore} />
      <AttentionControls project={project} />
      <RiskControls project={project} />
    </div>
  );
}

// Re-exports for modular backwards-compatibility
export {
  getControls,
  RiskControls,
  ChangeOrderControls,
  CostOutlook,
};

export default ProjectOverview;
