import React from "react";
import "./ProjectControls.css";

const usd = (value) => `$${value.toFixed(1)}M`;

export function getControls(project) {
  const task = project.tasks.find((item) => item.status === "In progress") || project.tasks[0];
  const actual = project.costs.reduce((sum, phase) => sum + phase.actual, 0);
  const remaining = Math.max(0, project.budget - actual);
  return {
    task,
    actual,
    committed: remaining * 0.7,
    forecast: Math.max(project.budget, actual) + project.budget * 0.04,
    pending: project.budget * 0.015,
  };
}

function Source({ project, title, sender, body }) {
  return (
    <details className="control-source">
      <summary>View source</summary>
      <div>
        <strong>{title}</strong>
        <p>{sender} · {project.id} · 11 Sep 2026</p>
        <p>{body}</p>
        <small>Mock source · Awaiting engineer validation</small>
      </div>
    </details>
  );
}

export function MilestoneControls({ project }) {
  const { task } = getControls(project);
  const rows = [
    ["Current work package release", "2026-09-18", "2026-09-23", "+5 days", task.owner, "Approved drawing revision outstanding"],
    ["Critical equipment installation", "2026-10-05", "2026-10-08", "+3 days", "Mechanical lead", "Vendor delivery and inspection release"],
    ["Commissioning readiness review", "2026-10-22", "2026-10-22", "On plan", "Commissioning lead", "Safety actions and test records to close"],
  ];
  return <section className="control-section">
    <div className="section-head"><h2>Milestone tracking</h2><span>Mock baseline · 12 Sep 2026</span></div>
    <div className="table-scroll"><table><thead><tr>{["Milestone", "Planned", "Forecast", "Variance", "Owner / blocker", "Evidence"].map(label => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{rows.map(([name, planned, forecast, variance, owner, blocker]) => <tr key={name}>
        <td><strong>{name}</strong></td><td>{planned}</td><td>{forecast}</td><td>{variance}</td><td>{owner}<small>{blocker}</small></td>
        <td><Source project={project} title="Weekly schedule review" sender="Project controls" body={`${name}: forecast ${forecast}. ${blocker}. Linked work package: ${task.id}.`} /></td>
      </tr>)}</tbody></table></div>
  </section>;
}

export function AttentionControls({ project }) {
  const { task } = getControls(project);
  const items = [
    ["Change approval", "Review revised installation scope", "Commercial lead", "15 Sep", "Pending", "Client email: please assess the revised scope and submit the cost and schedule impact before approval."],
    ["Technical query", "Confirm drawing revision before release", task.owner, "10 Sep", "Overdue", `Engineering message: confirm the approved drawing revision for ${task.id} before releasing the work package.`],
    ["Safety review", "Close outstanding hazard-review action", "Process safety lead", "11 Sep", "Overdue", "Review minutes: submit the outstanding hazard assessment evidence for authorised review before the readiness gate."],
  ];
  return <section className="control-section"><div className="section-head"><h2>Needs attention</h2><span>3 decisions · 2 overdue</span></div>
    {items.map(([type, title, owner, due, status, body]) => <article className="control-item" key={type}>
      <div><span className="control-label">{type}</span><h3>{title}</h3><p>{owner} · Due {due} 2026</p></div>
      <div><span className={`control-status ${status === "Overdue" ? "is-late" : ""}`}>{status}</span><Source project={project} title={title} sender={owner} body={body} /></div>
    </article>)}
  </section>;
}

export function CostOutlook({ project }) {
  const { actual, committed, forecast, pending } = getControls(project);
  return <section className="control-section"><div className="section-head"><h2>Cost outlook</h2><span>Mock forecast · USD</span></div>
    <div className="control-costs">{[
      ["Approved budget", project.budget], ["Actual spent", actual], ["Outstanding commitments", committed],
      ["Forecast final cost", forecast], ["Forecast overrun", forecast - project.budget], ["Pending changes", pending],
    ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{usd(value)}</strong></div>)}</div>
    <p className="control-note">Commitments are unpaid orders. Pending changes are excluded from the final-cost forecast.</p>
    <Source project={project} title="Monthly cost forecast and change register" sender="Cost controller" body={`Actual spend reconciles to the phase ledger. Outstanding orders: ${usd(committed)}. Forecast includes remaining work and ${usd(forecast - project.budget)} overrun; ${usd(pending)} in unapproved changes is tracked separately.`} />
  </section>;
}

export function DeliveryControls({ project }) {
  const { task } = getControls(project);
  return <section className="control-section"><div className="section-head"><h2>Critical deliveries</h2><span>2 packages</span></div>
    {[
      ["Pump and motor package", "01 Oct", "04 Oct", "Inspection release pending", "Critical equipment installation"],
      ["Control panel and instruments", "18 Sep", "18 Sep", "Vendor documents under review", task.title],
    ].map(([name, required, expected, status, affected]) => <article className="control-item" key={name}>
      <div><h3>{name}</h3><p>Required {required} · Expected {expected} 2026</p><p>Affects: {affected}</p><span className="control-label">{status}</span></div>
      <Source project={project} title={`${name} delivery update`} sender="Procurement lead / vendor email" body={`Expected arrival ${expected} 2026; required ${required} 2026. ${status}. Confirm release and transport before updating the milestone.`} />
    </article>)}
  </section>;
}

export function RiskControls({ project }) {
  return <section className="control-section"><div className="section-head"><h2>Risk overview</h2><span>3 open · 1 safety action overdue</span></div>
    {[
      ["Late equipment release", "Likely", "3-day installation delay", "Procurement lead", "Expedite inspection and confirm dispatch", "15 Sep"],
      ["Specialist workforce gap", "Possible", "5-day commissioning delay", "Construction manager", "Confirm certified crew availability", "16 Sep"],
      ["Incomplete safety-review evidence", "Possible", "Readiness gate may be held", "Process safety lead", "Close overdue review action with signed evidence", "11 Sep"],
    ].map(([title, likelihood, impact, owner, mitigation, due]) => <article className="control-item" key={title}>
      <div><h3>{title}</h3><p>{likelihood} · {impact}</p><p>{mitigation}</p><small>{owner} · Action due {due} 2026</small></div>
      <Source project={project} title={`${title} / risk review`} sender={owner} body={`Risk remains open. Impact: ${impact}. Mitigation: ${mitigation}. Qualitative likelihood is a mock assessment, pending review.`} />
    </article>)}
  </section>;
}
