import React, { useState } from "react";
import { SharedDetailPanel } from "./SharedControls.jsx";
import "./ProjectOverview.css";

const changeDeterminationLabels = {
  allowed: "Supported with conditions",
  "not-allowed": "Not recommended",
  "requires-review": "Requires review",
};

function determinationTone(value) {
  if (value === "allowed") return "is-supported";
  if (value === "requires-review") return "is-review";
  return "is-late";
}

export function ChangeOrderCard({ item }) {
  const [isOpen, setIsOpen] = useState(false);

  const badges = [
    { label: "Request ID", value: item.id },
    { label: "Standard", value: item.standardId },
  ];

  const sections = [
    {
      label: "Technical Query Agent",
      content: `${item.technicalAgentResult || "Unavailable"} based on matching technical-query records and prior site experience.`,
    },
    {
      label: "Compliance Agent",
      content: `${item.complianceAgentResult || "Unavailable"} against ${item.standardId}.`,
    },
    {
      label: "Final reasoning",
      content: item.recommendedResponse,
    },
    {
      label: "Recommended action",
      content: item.followUpAction || "No action required before project engineer validation.",
    },
  ];

  return (
    <article className="control-card">
      <div className="control-item">
        <div>
          <span className="control-label">{item.requestType}</span>
          <h3>{item.title}</h3>
          <p>{item.requestedChange}</p>
          <small>{item.id} · Standard: {item.standardId}</small>
        </div>
        <div className="control-tag-stack">
          <span className="control-label">Agent determination</span>
          <span className={`control-status ${determinationTone(item.determination)}`}>
            {changeDeterminationLabels[item.determination] || "Requires review"}
          </span>
        </div>
      </div>
      <SharedDetailPanel
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        title="Agent Reasoning & Compliance Details"
        badges={badges}
        sections={sections}
      />
    </article>
  );
}

export function ChangeOrderControls({ project }) {
  const changeOrders = project.changeOrders || [];

  return (
    <section className="control-section">
      <div className="section-head">
        <div>
          <h2>Change orders</h2>
          <small className="section-subtitle">Change-of-Material Compliance Workflow</small>
        </div>
        <span>{changeOrders.length} requests</span>
      </div>
      {changeOrders.map((item) => (
        <ChangeOrderCard key={item.id} item={item} />
      ))}
    </section>
  );
}

export default ChangeOrderControls;
