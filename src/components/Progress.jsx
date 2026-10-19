import React from "react";

export function Progress({ value, label = true }) {
  const percent = Number(value || 0);
  return (
    <div className="progress-wrap">
      {label && (
        <div className="progress-label">
          <span>Overall progress</span>
          <strong>{percent}%</strong>
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={`${percent}% complete`}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default Progress;
