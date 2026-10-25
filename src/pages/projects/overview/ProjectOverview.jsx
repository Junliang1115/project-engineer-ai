import React from "react";
import { Tag } from "../../../components/Tag.jsx";
import { Progress } from "../../../components/Progress.jsx";
import { CostOutlook } from "../costs/CostAnalysis.jsx";
import RiskControls from "../risks/RiskSection.jsx";
import { buildProjectOverview } from "./projectOverviewModel.js";
import "./ProjectOverview.css";

const formatVariance = (value) => `${value > 0 ? "+" : ""}$${value.toFixed(1)}M`;

export function AttentionControls({ overview }) {
  const items       = overview.notifications;
  const actionCount = items.filter((i) => i.actionRequired).length;

  return (
    <section className="panel overview-notifications">
      <div className="section-head">
        <div>
          <h2>Needs attention</h2>
          <p>Active risks, pending requests, and project updates requiring action.</p>
        </div>
        {actionCount > 0 && (
          <span className="attn-action-badge">{actionCount} need action</span>
        )}
      </div>

      <div className="attn-feed">
        {items.length === 0 && (
          <p className="notification-empty">No items need attention.</p>
        )}
        {items.map((item) => (
          <article className="attn-feed-row" key={item.id}>
            <div className={`attn-dot attn-dot-${item.dotColor}`} />

            <div className="attn-feed-body">
              <div className="attn-feed-top">
                <span className={`attn-type-badge attn-type-${item.dotColor}`}>
                  {item.type}
                </span>
                <span className="attn-feed-title">{item.title}</span>
              </div>
              <div className="attn-feed-meta">
                <span>{item.owner}</span>
                {item.source && (
                  <span className="attn-meta-sep">{item.source}</span>
                )}
                {item.due && (
                  <span className="attn-meta-sep">{item.due}</span>
                )}
              </div>
            </div>

            {item.actionRequired && (
              <span className="attn-action-pill">Review</span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProjectOverview({ project }) {
  const overview = buildProjectOverview(project);
  const days = overview.daysToMilestone;

  return (
    <div className="project-overview-content">
      <div className="section-page-header">
        <div>
          <div className="title-line">
            <span className="technical-id">{project.id}</span>
            <Tag type="warm-gray" size="sm">{project.phase}</Tag>
          </div>
          <h1>{project.name}</h1>
        </div>
      </div>

      <section className="panel current-phase-lead" aria-label="Current phase summary">
        <div className="phase-verdict">
          <span>Current phase</span>
          <strong>{overview.phase}</strong>
        </div>
        <div className="health-metrics">
          <div><span>Progress</span><strong>{overview.progress}%</strong><Progress value={overview.progress} label={false} /></div>
          <div><span>Cost variance</span><strong className={overview.costVariance < 0 ? "is-negative" : ""}>{formatVariance(overview.costVariance)}</strong></div>
          <div><span>Open risks</span><strong>{overview.openRiskCount}</strong></div>
          <div><span>Overdue actions</span><strong>{overview.overdueCount}</strong></div>
        </div>
      </section>

      <section className="panel current-milestone-summary" aria-label="Current milestone">
        <div>
          <span className="summary-label">Current milestone</span>
          <h2>{overview.currentMilestone?.name || "No active milestone"}</h2>
        </div>
        <div>
          <span className="summary-label">Time remaining</span>
          <strong>{days == null ? "Not set" : days < 0 ? `${Math.abs(days)} days late` : `${days} days`}</strong>
        </div>
      </section>

      <AttentionControls overview={overview} />
    </div>
  );
}

export { RiskControls, CostOutlook };

export default ProjectOverview;
