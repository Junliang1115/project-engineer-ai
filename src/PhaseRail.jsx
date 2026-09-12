import React from "react";
import { phases } from "./data.js";
import { phaseIndex } from "./ProjectTokens.jsx";

export function PhaseRail({ project }) {
  const current = phaseIndex(project.phase);
  return (
    <section className="panel phase-panel">
      <div className="section-head">
        <div>
          <h2>Phase progression</h2>
          <p>Stage gate position across the project lifecycle.</p>
        </div>
        <span className="phase-count">
          {current + 1} / {phases.length}
        </span>
      </div>
      <ol className="phase-rail">
        {phases.map((phase, i) => (
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

export default PhaseRail;
