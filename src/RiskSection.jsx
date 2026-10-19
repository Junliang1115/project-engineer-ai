import React, { useState } from "react";
import { ListRow } from "./components/ListRow.jsx";
import { FilterBar, FilterSelect } from "./components/FilterBar.jsx";
import "./ProjectOverview.css";
import "./RiskSection.css";

export const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const priorityClass = (p) => `priority-${(p || "Medium").toLowerCase()}`;

const PRIORITY_FILTERS = ["All", "Critical", "High", "Medium", "Low"];
const PRIORITY_COLORS = {
  Critical: "var(--danger)",
  High: "var(--warning)",
  Medium: "var(--accent)",
  Low: "var(--success)",
};

const riskAreas = (risk) =>
  risk.affectedAreas?.length ? risk.affectedAreas : [risk.category].filter(Boolean);
const uniqueSorted = (values) => [...new Set(values.filter(Boolean))].sort();

// ── Risk card ────────────────────────────────────────────────────
export function RiskCard({ risk }) {
  const priority = risk.priority || "Medium";
  const areas = riskAreas(risk);

  return (
    <ListRow
      className={`rsk-card ${priorityClass(priority)}`}
      title={risk.title}
      description={
        <span className="rsk-risk-details">
          <span className="rsk-secondary-meta">
            <span className="rsk-id technical-id">{risk.id}</span>
            <span className="rsk-owner">{risk.owner || "Unassigned"}</span>
            {(risk.due || risk.dueDate) && (
              <span className="rsk-due">Due {risk.due || risk.dueDate}</span>
            )}
          </span>
          <span className="rsk-area-row">
            {areas.map((area) => (
              <span className="rsk-area-tag" key={area}>{area}</span>
            ))}
          </span>
        </span>
      }
      trailing={
        <span className={`rsk-priority-badge ${priorityClass(priority)}`}>
          {priority}
        </span>
      }
    />
  );
}

// ── Risk page ────────────────────────────────────────────────────
export function RiskControls({ project }) {
  const [filterPriority, setFilterPriority] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterArea, setFilterArea] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const risks = project?.risks || [];
  const areaOptions = uniqueSorted(risks.flatMap(riskAreas));
  const statusOptions = uniqueSorted(risks.map((r) => r.status));
  const isFiltered =
    filterPriority !== "All" ||
    filterArea !== "All" ||
    filterStatus !== "All" ||
    searchTerm.trim() !== "";
  const resetFilters = () => {
    setFilterPriority("All");
    setFilterArea("All");
    setFilterStatus("All");
    setSearchTerm("");
  };
  const openRisks = risks.filter(
    (r) => (r.status || "").toLowerCase() !== "closed"
  );
  const overdueCount = openRisks.filter((r) => {
    const t = Date.parse(r.dueDate || r.due);
    return Number.isFinite(t) && t < Date.now();
  }).length;

  const counts = {
    Critical: openRisks.filter((r) => r.priority === "Critical").length,
    High: openRisks.filter((r) => r.priority === "High").length,
    Medium: openRisks.filter((r) => r.priority === "Medium").length,
    Low: openRisks.filter((r) => r.priority === "Low").length,
  };

  const query = searchTerm.trim().toLowerCase();
  const displayed = [...risks]
    .filter(
      (r) => filterPriority === "All" || r.priority === filterPriority
    )
    .filter((r) => filterArea === "All" || riskAreas(r).includes(filterArea))
    .filter((r) => filterStatus === "All" || r.status === filterStatus)
    .filter(
      (r) =>
        !query ||
        [r.id, r.title, r.category, r.owner, ...(r.affectedAreas || [])].some(
          (value) => String(value || "").toLowerCase().includes(query)
        )
    )
    .sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? priorityOrder.Medium) -
        (priorityOrder[b.priority] ?? priorityOrder.Medium) ||
        (a.dueDate || a.due || "9999").localeCompare(
          b.dueDate || b.due || "9999"
        )
    );

  const statCards = [
    { label: "Critical", key: "Critical", mod: "critical" },
    { label: "High", key: "High", mod: "high" },
    { label: "Medium", key: "Medium", mod: "medium" },
    { label: "Low", key: "Low", mod: "low" },
  ];

  return (
    <div className="risks-page">
      <div className="section-page-header">
        <div>
          <h1>Risks</h1>
          <p className="risk-page-subtitle">
            Priority view of threats requiring project action.
          </p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="rsk-stat-row">
        {statCards.map(({ label, key, mod }) => (
          <button
            key={key}
            type="button"
            className={`rsk-stat-card rsk-stat-${mod}${filterPriority === key ? " is-active" : ""
              }`}
            onClick={() =>
              setFilterPriority((p) => (p === key ? "All" : key))
            }
            title={`Filter by ${label}`}
          >
            <span className="rsk-stat-label">{label}</span>
            <span className="rsk-stat-num">{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* ── Register ── */}
      <section className="rsk-register" aria-label="Risk register">
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search risk title, ID or owner"
          ariaLabel="Search risks"
          onReset={resetFilters}
          canReset={isFiltered}
          count={displayed.length}
        >
          {/* Shares state with the stat cards: clicking a card updates this, and vice versa */}
          <FilterSelect
            label="Filter by priority"
            value={filterPriority}
            onChange={setFilterPriority}
            options={PRIORITY_FILTERS.map((p) => ({
              value: p,
              label: p === "All" ? "All priorities" : p,
            }))}
            style={
              filterPriority !== "All"
                ? { borderColor: PRIORITY_COLORS[filterPriority] }
                : undefined
            }
          />
          {areaOptions.length > 1 && (
            <FilterSelect
              label="Filter by affected area"
              value={filterArea}
              onChange={setFilterArea}
              options={[{ value: "All", label: "All areas" }, ...areaOptions]}
            />
          )}
          {statusOptions.length > 1 && (
            <FilterSelect
              label="Filter by status"
              value={filterStatus}
              onChange={setFilterStatus}
              options={[{ value: "All", label: "All statuses" }, ...statusOptions]}
            />
          )}
        </FilterBar>

        <div className="rsk-list">
          {displayed.map((risk) => <RiskCard key={risk.id} risk={risk} />)}
          {displayed.length === 0 && (
            <p className="risk-empty">
              No{filterPriority !== "All" ? ` ${filterPriority.toLowerCase()}` : ""}{" "}
              risks match the selected filters.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default RiskControls;
