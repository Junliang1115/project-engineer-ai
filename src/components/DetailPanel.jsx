import React from "react";
import { ChevronDown } from "lucide-react";
import "../ProjectOverview.css";

export function DetailPanel({
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

export default DetailPanel;
