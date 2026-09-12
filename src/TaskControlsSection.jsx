import React, { useState } from "react";
import { ChevronDown, Mail } from "lucide-react";
import { StatusTag, money } from "./ProjectTokens.jsx";

export function getTaskEvidence(task) {
  const sourceType =
    task.status === "Complete" ? "Inspection record" : task.status === "Blocked" ? "Email" : "Site message";
  const sourceOwner =
    task.status === "Blocked" ? "Compliance inbox" : task.status === "Complete" ? task.owner : "Project controls";
  const sourceDate = task.status === "Complete" ? "2026-09-01 09:20" : "2026-09-11 16:45";
  const confidence =
    task.status === "Complete" ? "Validated" : task.status === "Blocked" ? "Needs review" : "Progress update";

  return {
    sourceType,
    sourceOwner,
    sourceDate,
    confidence,
    subject: `${task.id} / ${task.title}`,
    validationNote:
      task.status === "Complete"
        ? "Completion is validated from signed inspection evidence and cost actuals can be reconciled."
        : task.status === "Blocked"
          ? "Status remains blocked until the referenced message/document resolves the compliance hold."
          : "Progress should be updated from the latest site message, then checked against cost and schedule variance.",
  };
}

export function TaskEvidence({ evidence }) {
  return (
    <tr className="task-source-row">
      <td colSpan="8">
        <div className="task-source-panel">
          <div className="task-source-heading">
            <Mail size={17} aria-hidden="true" />
            <div>
              <strong>Source evidence</strong>
              <span>{evidence.subject}</span>
            </div>
          </div>
          <div className="source-evidence-grid">
            <div>
              <span>Source type</span>
              <strong>{evidence.sourceType}</strong>
            </div>
            <div>
              <span>Owner / sender</span>
              <strong>{evidence.sourceOwner}</strong>
            </div>
            <div>
              <span>Received</span>
              <strong>{evidence.sourceDate}</strong>
            </div>
            <div>
              <span>Status signal</span>
              <strong>{evidence.confidence}</strong>
            </div>
          </div>
          <p>
            <span>Validation note</span>
            {evidence.validationNote}
          </p>
        </div>
      </td>
    </tr>
  );
}

export function TaskTable({ tasks }) {
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  return (
    <section className="panel table-panel">
      <div className="section-head">
        <div>
          <h2>Task controls</h2>
          <p>Delivery status and cost performance by work package.</p>
        </div>
        <span>{tasks.length} tasks</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Task / ID</th>
              <th>Discipline</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Due date</th>
              <th className="num">Estimate</th>
              <th className="num">Actual</th>
              <th className="num">Variance</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const variance = t.cost_estimate - t.cost_actual;
              const evidence = getTaskEvidence(t);
              const isExpanded = expandedTaskId === t.id;
              return (
                <React.Fragment key={t.id}>
                  <tr>
                    <td>
                      <strong>{t.title}</strong>
                      <small>{t.id}</small>
                      <button
                        type="button"
                        className="task-source-toggle"
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                      >
                        <ChevronDown size={14} aria-hidden="true" />
                        Expand source
                      </button>
                    </td>
                    <td>{t.discipline}</td>
                    <td>
                      <StatusTag status={t.status} />
                    </td>
                    <td>{t.owner}</td>
                    <td className="mono">{t.due_date}</td>
                    <td className="num">{money(t.cost_estimate)}</td>
                    <td className="num">{money(t.cost_actual)}</td>
                    <td className={`num ${variance < 0 ? "negative" : "positive"}`}>
                      {variance >= 0 ? "+" : ""}
                      {money(variance)}
                    </td>
                  </tr>
                  {isExpanded && <TaskEvidence evidence={evidence} />}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default TaskTable;
