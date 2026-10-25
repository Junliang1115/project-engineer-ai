import React, { useState } from "react";
import { filterActivitiesByDate } from "./activityLog.js";
import { ListRow } from "./components/ListRow.jsx";
import { FilterBar, FilterSelect } from "./components/FilterBar.jsx";
import "./ActivityLog.css";

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7days", label: "Last 7 days" },
  { value: "30days", label: "Last 30 days" },
];

export function ActivityLog({ project, onSelectActivity }) {
  const activities = project?.activities || [];
  const [dateRange, setDateRange] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const filteredActivities = filterActivitiesByDate(activities, dateRange);
  const query = searchTerm.trim().toLowerCase();
  const searchedActivities = filteredActivities.filter(
    (activity) =>
      !query ||
      [activity.title, activity.summary, activity.type, activity.source, activity.relatedTo, activity.status]
        .some((value) => String(value || "").toLowerCase().includes(query))
  );
  const activityStatusOrder = { "Needs review": 0, Done: 1, Rejected: 2 };
  const sortedActivities = [...searchedActivities].sort(
    (a, b) => (activityStatusOrder[a.status] ?? 0) - (activityStatusOrder[b.status] ?? 0)
  );
  const reviewCount = filteredActivities.filter((activity) => activity.status === "Needs review").length;

  return (
    <div className="activity-log-page">
      <div className="section-page-header">
        <div>
          <h1>Activity log</h1>
          <p className="activity-page-subtitle">Updates that require review or have been completed.</p>
        </div>
      </div>

      <section className="activity-summary-strip" aria-label="Activity summary">
        <div><span>Total updates</span><strong>{filteredActivities.length}</strong></div>
        <div><span>Needs review</span><strong>{reviewCount}</strong></div>
      </section>

      <section className="activity-log-panel" aria-label="Project updates">
        <FilterBar
          className="activity-toolbar"
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search title, source or task ID"
          ariaLabel="Search activity log"
          count={sortedActivities.length}
        >
          <FilterSelect
            label="Filter by date"
            value={dateRange}
            onChange={setDateRange}
            options={DATE_RANGE_OPTIONS}
          />
        </FilterBar>
        <div className="activity-log-list">
          {sortedActivities.length === 0 ? (
            <p className="activity-empty">No project updates match the selected filters.</p>
          ) : (
            sortedActivities.map((activity) => {
              // Gmail rows open the email review page (proposed changes, approve / edit / reject).
              const canOpen = Boolean(onSelectActivity && activity.reviewable && activity.activityId);
              const proposals = activity.proposalCount
                ? `${activity.proposalCount} proposed change${activity.proposalCount > 1 ? "s" : ""}`
                : null;
              return (
                <ListRow
                  key={activity.id}
                  as={canOpen ? "button" : "article"}
                  onClick={canOpen ? () => onSelectActivity(activity.activityId) : undefined}
                  className={`activity-log-row${canOpen ? " is-clickable" : ""}`}
                  leading={<span className="activity-type">{activity.type}</span>}
                  title={activity.title || activity.summary}
                  description={[activity.source, activity.relatedTo, proposals]}
                  trailing={
                    <>
                      <time>{activity.received || "Date unavailable"}</time>
                      <span className={`activity-status is-${(activity.status || "").toLowerCase().replaceAll(" ", "-")}`}>
                        {activity.status}
                      </span>
                    </>
                  }
                />
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

export default ActivityLog;
