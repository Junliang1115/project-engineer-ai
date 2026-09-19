import React from "react";
import { phases as defaultPhases } from "./data.js";
import { phaseIndex } from "./ProjectTokens.jsx";

/**
 * Rail
 * Unified progression stepper component using the sleek Phase design for both:
 * - Phase progression: pass `project` or `phases`
 * - Milestone progression: pass `milestones`
 */
export function Rail({
  project,
  phases,
  currentPhase,
  milestones,
  selectedMilestoneId,
  onSelectMilestone,
  title,
  subtitle,
}) {
  const isMilestone = Boolean(milestones);

  if (isMilestone) {
    const list = milestones || project?.milestones || [];
    const completedCount = list.filter((m) => m.status === "Complete").length;
    const currentPhaseName = currentPhase || project?.phase || "Construction";

    return (
      <section className="panel phase-panel milestone-progression-panel" aria-label="Milestone progression">
        <div className="section-head">
          <div>
            <h2>{title || "Milestone progression"}</h2>
            <p>{subtitle || `Stage gate milestone sequence for the current ${currentPhaseName} phase.`}</p>
          </div>
          <span className="phase-count">
            {completedCount} / {list.length}
          </span>
        </div>
        <ol
          className="phase-rail milestone-rail"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, list.length)}, minmax(0, 1fr))` }}
        >
          {list.map((m, idx) => {
            const isComplete = m.status === "Complete";
            const isBlocked = m.status === "Blocked";
            const isInProgress = m.status === "In progress";
            const isSelected = selectedMilestoneId === m.id;

            const stateClass = isComplete
              ? "complete"
              : isBlocked
              ? "blocked"
              : isInProgress
              ? "current"
              : "remaining";

            return (
              <li
                key={m.id}
                className={`${stateClass} ${isSelected ? "is-selected" : ""} is-clickable`}
                onClick={() => onSelectMilestone?.(isSelected ? null : m.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectMilestone?.(isSelected ? null : m.id);
                  }
                }}
                title={`${m.id}: ${m.name} (${m.status})`}
              >
                <span className="phase-symbol">
                  {isComplete ? "✓" : isBlocked ? "!" : idx + 1}
                </span>
                <div>
                  <strong>
                    {m.name?.startsWith(m.id) ? m.name : m.id ? `${m.id} ${m.name}` : m.name}
                  </strong>
                  <small>
                    {isComplete ? "Completed" : isBlocked ? "Blocked" : isInProgress ? "Current gate" : "Remaining"}
                    {m.forecastDate ? ` · ${m.forecastDate}` : ""}
                  </small>
                </div>
              </li>

            );
          })}
        </ol>
      </section>
    );
  }

  // Phase progression
  const activePhase = currentPhase || project?.phase;
  const current = activePhase ? phaseIndex(activePhase) : 0;
  const phaseList = phases || defaultPhases;

  return (
    <section className="panel phase-panel" aria-label="Phase progression">
      <div className="section-head">
        <div>
          <h2>{title || "Phase progression"}</h2>
          <p>{subtitle || "Stage gate position across the project lifecycle."}</p>
        </div>
        <span className="phase-count">
          {current + 1} / {phaseList.length}
        </span>
      </div>
      <ol
        className="phase-rail"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, phaseList.length)}, minmax(0, 1fr))` }}
      >
        {phaseList.map((phase, i) => (
          <li
            className={i < current ? "complete" : i === current ? "current" : "remaining"}
            key={phase}
          >
            <span className="phase-symbol">{i < current ? "✓" : i + 1}</span>
            <div>
              <strong>{phase}</strong>
              <small>
                {i < current ? "Completed" : i === current ? "Current phase" : "Remaining"}
              </small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export const PhaseRail = Rail;
export const MilestoneRail = (props) => <Rail {...props} />;
export default Rail;

