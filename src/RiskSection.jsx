import React, { useState } from "react";
import { DetailPanel } from "./components/DetailPanel.jsx";
import "./ProjectOverview.css";

export function RiskCard({ risk }) {
  const [isOpen, setIsOpen] = useState(false);

  const badges = [
    { label: "Confidence", value: risk.confidence },
    { label: "Affected milestone", value: risk.affected },
  ];

  const sections = [
    {
      label: "Trigger & Message",
      content: risk.trigger || "Threshold triggered from project monitoring",
    },
    {
      label: "Evidence / source",
      content: risk.evidence || "Project evidence record",
    },
    {
      label: "Risk reasoning / why it triggers",
      content: risk.reasoning || risk.title,
    },
    {
      label: "Recommended action",
      content: `${risk.mitigation || "Review and mitigate risk"}. Action target: ${risk.due || "TBD"}${risk.due && !risk.due.includes("202") ? " 2026" : ""} (Assigned to: ${risk.owner || "Unassigned"}).`,
    },
  ];

  const dueDisplay = risk.due ? `Action due ${risk.due}${risk.due.includes("202") ? "" : " 2026"}` : "Action due pending";

  return (
    <article className="control-card">
      <div className="control-item">
        <div>
          <h3>{risk.title}</h3>
          <p>{risk.likelihood} · {risk.impact}</p>
          <p>{risk.mitigation}</p>
          <small>{risk.owner} · {dueDisplay}</small>
        </div>
        <div className="control-tag-stack">
          <span className="control-label">Risk rating</span>
          <span className="control-status is-review">{risk.likelihood}</span>
        </div>
      </div>
      <DetailPanel
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        title="Risk Reasoning & Evidence Details"
        badges={badges}
        sections={sections}
      />
    </article>
  );
}

export function RiskControls({ project }) {
  const risks = project?.risks || [];
  const openCount = risks.filter((r) => (r.status || "").toLowerCase() !== "closed").length;
  const overdueCount = risks.filter(
    (r) =>
      (r.status || "").toLowerCase().includes("overdue") ||
      (r.category || "").toLowerCase().includes("safety") ||
      (r.title || "").toLowerCase().includes("safety")
  ).length;

  return (
    <section className="control-section">
      <div className="section-head">
        <h2>Risk overview</h2>
        <span>
          {openCount} open{overdueCount > 0 ? ` · ${overdueCount} safety action overdue` : ""}
        </span>
      </div>
      {risks.length === 0 ? (
        <article className="control-card">
          <p style={{ padding: "1.25rem", color: "var(--text-muted)", margin: 0 }}>
            No risks registered for this project.
          </p>
        </article>
      ) : (
        risks.map((risk) => (
          <RiskCard key={risk.id} risk={risk} />
        ))
      )}
    </section>
  );
}

export default RiskControls;
