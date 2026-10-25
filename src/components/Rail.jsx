import React from "react";

/**
 * Rail
 * Reusable progression stepper template component for milestones, stage gates, or workflow steps.
 *
 * Props:
 * - items (or milestones): Array of step items [{ id, name/title, status, forecastDate/date, subtitle }]
 * - selectedId (or selectedMilestoneId): ID of the currently selected step
 * - onSelect (or onSelectMilestone): Callback when a step is clicked `(id) => void`
 * - subtitle: Optional line shown above the steps
 * - ariaLabel: Accessible name for the rail (defaults to "Milestone progression")
 * - className: Optional additional CSS class for the section panel
 */
export function Rail({
  items,
  milestones,
  project,
  selectedId,
  selectedMilestoneId,
  onSelect,
  onSelectMilestone,
  subtitle,
  ariaLabel = "Milestone progression",
  className = "",
}) {
  const list = items || milestones || project?.milestones || [];
  const activeSelectedId =
    selectedId !== undefined ? selectedId : selectedMilestoneId;
  const handleSelect = onSelect || onSelectMilestone;

  const getStatusClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "completed") return "completed";
    if (s === "blocked") return "blocked";
    if (s === "in progress" || s === "active") return "current";
    return "remaining";
  };

  const getStatusLabel = (status, isInProgress, isComplete, isBlocked) => {
    if (isComplete) return "Completed";
    if (isBlocked) return "Blocked";
    if (isInProgress) return "Current gate";
    return "Remaining";
  };

  return (
    <section
      className={`panel phase-panel milestone-progression-panel ${className}`}
      aria-label={ariaLabel}
    >
      {subtitle && (
        <div className="section-head">
          <p>{subtitle}</p>
        </div>
      )}
      <ol
        className="phase-rail"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, list.length)}, minmax(0, 1fr))`,
        }}
      >
        {list.map((item, idx) => {
          const s = (item.status || "").toLowerCase();
          const isComplete = s === "completed";
          const isBlocked = s === "blocked";
          const isInProgress = s === "in progress" || s === "active";
          const isSelected = activeSelectedId === item.id;
          const stateClass = getStatusClass(item.status);

          const itemName =
            item.name || item.title || item.id || `Step ${idx + 1}`;
          const formattedTitle =
            item.id && !itemName.startsWith(item.id)
              ? `${item.id} ${itemName}`
              : itemName;

          const dateDetail = item.forecastDate || item.date || item.dueDate;
          const statusText =
            item.statusLabel ||
            getStatusLabel(item.status, isInProgress, isComplete, isBlocked);

          return (
            <li
              key={item.id || idx}
              className={`${stateClass} ${isSelected ? "is-selected" : ""} is-clickable`}
              onClick={() => handleSelect?.(isSelected ? "ALL" : item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect?.(isSelected ? "ALL" : item.id);
                }
              }}
              title={`${formattedTitle} (${item.status || "Planned"}) - click to filter`}
            >
              <span className="phase-symbol">
                {isComplete ? "✓" : isBlocked ? "!" : idx + 1}
              </span>
              <div>
                <strong>{formattedTitle}</strong>
                <small>
                  {statusText}
                  {dateDetail ? ` · ${dateDetail}` : ""}
                </small>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default Rail;
