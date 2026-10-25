import React, { useState } from "react";
import { ChevronDown, Mail } from "lucide-react";
import "../pages/projects/overview/ProjectOverview.css";

export function DetailPanelToggle({
  isOpen = false,
  onToggle,
  className = "",
}) {
  const label = isOpen ? "Collapse details" : "Expand details";

  return (
    <button
      type="button"
      className={`detail-panel-toggle ${isOpen ? "is-active" : ""} ${className}`}
      aria-label={label}
      title={label}
      aria-expanded={isOpen}
      onClick={onToggle}
    >
      <ChevronDown
        size={14}
        aria-hidden="true"
        style={{
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease",
        }}
      />
    </button>
  );
}

/**
 * DetailPanel — Unified expandable detail template.
 *
 * Supports three content modes (can combine):
 *   1. sections=[{ label, content }]   → 2-column grid cards  (Risk, Change Orders)
 *   2. evidence=[{ title, … }]         → Activity stream      (Milestones)
 *   3. body="…"                        → Plain text paragraph  (Cost Tracking)
 *   4. children                        → Any custom content
 *
 * Props:
 *   isOpen / onToggle  — controlled toggle state
 *   defaultOpen        — uncontrolled default
 *   title              — panel heading text
 *   subtitle           — secondary heading text (appears beside title)
 *   badges             — [{ label, value }] key-value pills
 *   sections           — [{ label, content }] grid cards
 *   evidence           — [{ title, sourceType, sourceOwner, sourceDate, confidence, summary }]
 *   body               — plain text paragraph
 *   remark             — highlighted remark line
 *   sender / date      — meta info for the heading line
 *   project            — project context for meta
 *   icon               — heading icon component (defaults to Mail)
 *   showToggle         — render inline toggle button (default true for standalone)
 *   as                 — "div" or "details" wrapper element
 *   className          — extra CSS class
 */
export function DetailPanel({
  isOpen,
  onToggle,
  defaultOpen = false,
  title,
  subtitle,
  badges = [],
  sections = [],
  evidence = [],
  body,
  remark,
  sender,
  date,
  project,
  icon: IconComponent = Mail,
  showToggle = true,
  isToggleOnly = false,
  as = "div",
  className = "",
  children,
}) {
  const isControlled = typeof isOpen === "boolean";
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const openState = isControlled ? isOpen : internalOpen;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  // Toggle-only mode — render just the button
  if (isToggleOnly) {
    return (
      <DetailPanelToggle
        isOpen={openState}
        onToggle={handleToggle}
        className={className}
      />
    );
  }

  const hasSections = sections.length > 0;
  const hasEvidence = evidence.length > 0;
  const hasHeading = title || subtitle || sender || date;

  const metaParts = [sender, project?.id, date].filter(Boolean);

  /* ── Panel content ───────────────────────────────── */
  const panelContent = (
    <div className="detail-panel-body">
      {/* Heading row: icon + title + subtitle + meta */}
      {hasHeading && (
        <div className="detail-panel-heading">
          <IconComponent size={17} aria-hidden="true" />
          <div>
            <strong>{title}</strong>
            {subtitle && (
              <span className="detail-panel-subtitle">{subtitle}</span>
            )}
            {metaParts.length > 0 && (
              <span className="detail-panel-meta">
                ({metaParts.join(" · ")})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Badges strip */}
      {badges.length > 0 && (
        <div className="detail-panel-badges">
          {badges.map((b, idx) => (
            <span key={idx} className="detail-panel-badge">
              <span className="badge-k">{b.label}:</span>
              <span className="badge-v">{b.value}</span>
            </span>
          ))}
        </div>
      )}

      {/* Remark */}
      {remark && (
        <p className="detail-panel-remark">
          <span className="detail-panel-remark-label">Task remark</span>
          {remark}
        </p>
      )}

      {/* Body text */}
      {body && (
        <p className="detail-panel-text">{body}</p>
      )}

      {/* Sections grid — for Risk / Change Order reasoning cards */}
      {hasSections && (
        <div className="detail-panel-grid">
          {sections.map((sec, idx) => (
            <div key={idx} className="detail-panel-card">
              <div className="detail-panel-card-head">
                <span className="detail-panel-label">{sec.label}</span>
              </div>
              <div className="detail-panel-card-content">
                {sec.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Evidence stream — for Milestone task logs */}
      {hasEvidence && (
        <div className="detail-panel-stream">
          {evidence.map((act, index) => (
            <div
              key={act.id || index}
              className={`detail-panel-evidence-card${index === 0 ? " is-latest" : ""}`}
            >
              <div className="detail-panel-evidence-head">
                <span className="detail-panel-evidence-title">
                  #{index + 1} {act.title}
                </span>
                {index === 0 && (
                  <span className="detail-panel-latest-badge">Latest</span>
                )}
              </div>
              <div className="source-evidence-grid">
                <div>
                  <span>Source type</span>
                  <strong>{act.sourceType}</strong>
                </div>
                <div>
                  <span>Owner / sender</span>
                  <strong>{act.sourceOwner || act.from}</strong>
                </div>
                <div>
                  <span>Received</span>
                  <strong>{act.sourceDate || act.received}</strong>
                </div>
                <div>
                  <span>Status signal</span>
                  <strong>{act.confidence || act.status}</strong>
                </div>
              </div>
              {act.summary && (
                <p className="detail-panel-evidence-summary">
                  <span>Summary</span>
                  {act.summary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fallback when no structured content */}
      {!hasSections && !hasEvidence && !body && !children && (
        <p className="detail-panel-empty">
          <span>Validation note</span>: No external discrepancy detected for
          this record.
        </p>
      )}

      {/* Custom children */}
      {children}
    </div>
  );

  /* ── Inline toggle mode (Risk / Change Order cards) ── */
  if (showToggle) {
    return (
      <div className={`detail-panel-wrapper ${className}`}>
        <DetailPanelToggle isOpen={openState} onToggle={handleToggle} />
        {openState && (
          <div className="detail-panel-container">{panelContent}</div>
        )}
      </div>
    );
  }

  /* ── External toggle mode (Milestone table rows, etc.) ── */
  if (as === "details" && !isControlled) {
    return (
      <details className={`detail-panel-source ${className}`} open={openState}>
        <summary className="detail-panel-summary">{title || "View source"}</summary>
        {panelContent}
      </details>
    );
  }

  return (
    <div className={`detail-panel-source ${className}`}>
      {panelContent}
    </div>
  );
}

DetailPanel.Toggle = DetailPanelToggle;
export default DetailPanel;
