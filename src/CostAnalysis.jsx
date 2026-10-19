import React, { useState, useEffect } from "react";
import { Forward, ArrowLeft, ChevronDown } from "lucide-react";
import { Tag, StatusTag } from "./components/Tag.jsx";

const phases = [
  "Concept",
  "Feasibility",
  "Design",
  "Procurement",
  "Construction",
  "Handover",
];
import { DetailPanel } from "./components/DetailPanel.jsx";
import { FilterBar, FilterSelect } from "./components/FilterBar.jsx";
import "./ProjectOverview.css";

const usdMillions = (value) => `$${value.toFixed(1)}M`;

export const CHART_COLORS = [
  "#3A9CC4",
  "#F59E0B",
  "#3FB97A",
  "#9B8CF0",
  "#E36D8A",
  "#8FA3B0",
];

export const CATEGORY_CONFIG = {
  Materials: {
    label: "Materials",
    color: "#3A9CC4",
    lightColor: "rgba(58, 156, 196, 0.15)",
  },
  "Salaries & Labor": {
    label: "Salaries & Labor",
    color: "#3FB97A",
    lightColor: "rgba(63, 185, 122, 0.15)",
  },
  Subcontractors: {
    label: "Subcontractors",
    color: "#9B8CF0",
    lightColor: "rgba(155, 140, 240, 0.15)",
  },
  "Equipment & Plant": {
    label: "Equipment & Plant",
    color: "#F59E0B",
    lightColor: "rgba(245, 158, 11, 0.15)",
  },
  "Permits & Fees": {
    label: "Permits & Fees",
    color: "#E36D8A",
    lightColor: "rgba(227, 109, 138, 0.15)",
  },
};

export function getProjectPhaseCosts(project) {
  const existing = Array.isArray(project?.costs) ? project.costs : [];
  if (existing.length > 0) {
    return phases.map((phaseName) => {
      const found = existing.find(
        (c) => c.phase && c.phase.toLowerCase() === phaseName.toLowerCase(),
      );
      return {
        phase: phaseName,
        estimate: Number(found?.estimate || 0),
        actual: Number(found?.actual || 0),
      };
    });
  }

  // Derive from project.expenditures if costs array is not precomputed
  const expenditures = Array.isArray(project?.expenditures)
    ? project.expenditures
    : [];
  return phases.map((phaseName) => {
    const phaseExp = expenditures.filter(
      (e) => String(e.phase || "").toLowerCase() === phaseName.toLowerCase(),
    );
    const estimate =
      Math.round(phaseExp.reduce((s, e) => s + (e.estimate || 0), 0) * 10) / 10;
    const actual =
      Math.round(phaseExp.reduce((s, e) => s + (e.actual || 0), 0) * 10) / 10;
    return {
      phase: phaseName,
      estimate,
      actual,
    };
  });
}

export function getPhaseExpenditures(project, phase) {
  const expenditures = Array.isArray(project?.expenditures)
    ? project.expenditures
    : [];
  const selectedPhase = String(phase || "").toLowerCase();

  return expenditures.filter(
    (expenditure) =>
      String(expenditure?.phase || "").toLowerCase() === selectedPhase,
  );
}
export function getPhaseCategoryBreakdown(expenditures) {
  const categories = [
    "Materials",
    "Salaries & Labor",
    "Subcontractors",
    "Equipment & Plant",
    "Permits & Fees",
  ];
  const totalActual = expenditures.reduce(
    (sum, item) => sum + (item.actual || 0),
    0,
  );
  const totalEstimate = expenditures.reduce(
    (sum, item) => sum + (item.estimate || 0),
    0,
  );
  const baseTotal = totalActual > 0 ? totalActual : totalEstimate;

  return categories.map((catKey) => {
    const config = CATEGORY_CONFIG[catKey] || {
      label: catKey,
      color: "#9ca3af",
      lightColor: "rgba(156,163,175,0.15)",
    };
    const items = expenditures.filter((i) => i.category === catKey);
    const catEstimate =
      Math.round(items.reduce((s, i) => s + (i.estimate || 0), 0) * 10) / 10;
    const catActual =
      Math.round(items.reduce((s, i) => s + (i.actual || 0), 0) * 10) / 10;
    const value = totalActual > 0 ? catActual : catEstimate;
    const percentage =
      baseTotal > 0 ? Math.round((value / baseTotal) * 100) : 0;

    return {
      category: catKey,
      label: config.label,
      color: config.color,
      lightColor: config.lightColor,
      itemsCount: items.length,
      estimate: catEstimate,
      actual: catActual,
      value,
      percentage,
    };
  });
}

export function CostChart({ project, onExploreMore }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isExploring, setIsExploring] = useState(false);
  const [activePhase, setActivePhase] = useState(
    project.phase || "Construction",
  );

  const costs = getProjectPhaseCosts(project);
  const maxVal = Math.max(
    ...costs.map((c) => Math.max(c.estimate || 0, c.actual || 0)),
    10,
  );
  const chartHeight = 220;
  const chartWidth = 700;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const bandWidth = innerWidth / (costs.length || 1);
  const barWidth = Math.min(22, bandWidth * 0.35);

  const gridTicks = [0, 0.25, 0.5, 0.75, 1];

  const activeCost = costs.find((c) => c.phase === activePhase) || {
    estimate: 0,
    actual: 0,
  };
  const activeVariance =
    Math.round((activeCost.estimate - activeCost.actual) * 10) / 10;
  const expenditures = getPhaseExpenditures(project, activePhase);

  const handleExploreClick = () => {
    if (onExploreMore) {
      onExploreMore(activePhase);
    } else {
      setIsExploring(!isExploring);
    }
  };

  return (
    <section className="panel chart-panel">
      <div className="section-head">
        <div>
          <h2>Cost by phase</h2>
          <p>Estimate compared with actual expenditure, USD millions.</p>
        </div>
        <div className="cost-section-actions">
          <button
            type="button"
            className="cost-explore-btn"
            onClick={handleExploreClick}
            aria-label="Explore more phase cost breakdown"
            title="Explore more"
          >
            <Forward size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="chart">
        <svg
          className="svg-cost-chart"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: "260px" }}
        >
          {gridTicks.map((pct) => {
            const y = paddingTop + innerHeight * (1 - pct);
            const val = Math.round(maxVal * pct);
            return (
              <g key={pct}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#373c40"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  fill="#a9b0b5"
                  fontSize="11"
                  textAnchor="end"
                  fontFamily='"IBM Plex Mono", monospace'
                >
                  ${val}M
                </text>
              </g>
            );
          })}

          {costs.map((c, i) => {
            const centerX = paddingLeft + i * bandWidth + bandWidth / 2;
            const estHeight = (c.estimate / maxVal) * innerHeight;
            const actHeight = (c.actual / maxVal) * innerHeight;
            const estY = paddingTop + innerHeight - estHeight;
            const actY = paddingTop + innerHeight - actHeight;
            const isHovered = hoveredIndex === i;
            const isSelected = activePhase === c.phase;

            return (
              <g
                key={c.phase}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => setActivePhase(c.phase)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={paddingLeft + i * bandWidth + 4}
                  y={paddingTop}
                  width={bandWidth - 8}
                  height={innerHeight}
                  fill={
                    isSelected && isExploring
                      ? "rgba(231, 166, 59, 0.12)"
                      : isHovered
                        ? "rgba(255, 255, 255, 0.04)"
                        : "transparent"
                  }
                  rx="4"
                />

                <rect
                  x={centerX - barWidth - 2}
                  y={estY}
                  width={barWidth}
                  height={Math.max(0, estHeight)}
                  fill="#8d969d"
                  rx="2"
                  ry="2"
                  className="cost-chart-bar"
                />

                <rect
                  x={centerX + 2}
                  y={actY}
                  width={barWidth}
                  height={Math.max(0, actHeight)}
                  fill="#e7a63b"
                  rx="2"
                  ry="2"
                  className="cost-chart-bar"
                />

                <text
                  x={centerX}
                  y={paddingTop + innerHeight + 20}
                  fill={isSelected && isExploring ? "var(--accent)" : "#a9b0b5"}
                  fontWeight={isSelected && isExploring ? "600" : "400"}
                  fontSize="11"
                  textAnchor="middle"
                >
                  {c.phase}
                </text>

                {isHovered && (
                  <g>
                    <rect
                      x={Math.max(10, Math.min(chartWidth - 140, centerX - 65))}
                      y={Math.max(5, Math.min(estY, actY) - 50)}
                      width="130"
                      height="44"
                      fill="#25292c"
                      stroke="#4b5155"
                      strokeWidth="1"
                      rx="4"
                    />
                    <text
                      x={
                        Math.max(10, Math.min(chartWidth - 140, centerX - 65)) +
                        10
                      }
                      y={Math.max(5, Math.min(estY, actY) - 50) + 16}
                      fill="#8d969d"
                      fontSize="11"
                    >
                      Estimate: ${c.estimate}M
                    </text>
                    <text
                      x={
                        Math.max(10, Math.min(chartWidth - 140, centerX - 65)) +
                        10
                      }
                      y={Math.max(5, Math.min(estY, actY) - 50) + 34}
                      fill="#e7a63b"
                      fontSize="11"
                    >
                      Actual: ${c.actual}M
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        <div className="chart-legend">
          <div className="chart-legend-item">
            <span
              className="chart-legend-color"
              style={{ background: "#8d969d" }}
            />
            <span>Estimate</span>
          </div>
          <div className="chart-legend-item">
            <span
              className="chart-legend-color"
              style={{ background: "#e7a63b" }}
            />
            <span>Actual</span>
          </div>
        </div>
      </div>

      {isExploring && (
        <div
          className="cost-exploration-panel"
          aria-label={`Cost breakdown for ${activePhase}`}
        >
          <div
            className="phase-cost-nav"
            role="tablist"
            aria-label="Select phase to explore"
          >
            {phases.map((p) => {
              const pCost = costs.find((c) => c.phase === p);
              const isSelected = activePhase === p;
              return (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`phase-cost-tab ${isSelected ? "active" : ""}`}
                  onClick={() => setActivePhase(p)}
                >
                  <span className="phase-cost-tab-name">{p}</span>
                  <span className="phase-cost-tab-amount">
                    {pCost
                      ? `$${pCost.actual > 0 ? pCost.actual : pCost.estimate}M`
                      : "-"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="phase-explore-summary">
            <div className="phase-summary-card">
              <span>Phase</span>
              <strong>{activePhase}</strong>
            </div>
            <div className="phase-summary-card">
              <span>Estimate</span>
              <strong>${activeCost.estimate}M</strong>
            </div>
            <div className="phase-summary-card">
              <span>Actual spent</span>
              <strong>${activeCost.actual}M</strong>
            </div>
            <div className="phase-summary-card">
              <span>Variance</span>
              <strong className={activeVariance < 0 ? "negative" : "positive"}>
                {activeVariance >= 0 ? "+" : ""}$
                {Math.abs(activeVariance).toFixed(1)}M
              </strong>
            </div>
          </div>

          <div className="phase-expenditure-table-wrap">
            <table className="phase-expenditure-table">
              <thead>
                <tr>
                  <th>Expenditure item / Scope</th>
                  <th>Category</th>
                  <th>Contractor / Vendor</th>
                  <th className="num">Estimate</th>
                  <th className="num">Actual spent</th>
                  <th className="num">Variance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {expenditures.map((exp) => (
                  <tr key={exp.id}>
                    <td>
                      <strong>{exp.title}</strong>
                    </td>
                    <td>{exp.category}</td>
                    <td>{exp.vendor}</td>
                    <td className="num">${exp.estimate}M</td>
                    <td className="num">${exp.actual}M</td>
                    <td
                      className={`num ${exp.variance < 0 ? "negative" : "positive"}`}
                    >
                      {exp.variance >= 0 ? "+" : ""}$
                      {Math.abs(exp.variance).toFixed(1)}M
                    </td>
                    <td>
                      <StatusTag status={exp.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export function PhasePieChart({
  breakdown,
  totalAmount,
  isActual,
  selectedCategory,
  onSelectCategory,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const cx = 115;
  const cy = 115;
  const outerR = 95;
  const innerR = 58;

  const totalValue = breakdown.reduce((sum, b) => sum + b.value, 0);

  let currentAngle = -Math.PI / 2;
  const slices = breakdown.map((cat, i) => {
    const fraction = totalValue > 0 ? cat.value / totalValue : 0;
    const sliceAngle = Math.min(fraction * 2 * Math.PI, 2 * Math.PI - 0.0001);
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle += sliceAngle;

    const midAngle = startAngle + sliceAngle / 2;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);

    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

    const pathData =
      sliceAngle <= 0.001
        ? ""
        : `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;

    return {
      ...cat,
      index: i,
      fraction,
      midAngle,
      pathData,
    };
  });

  const activeHovered = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <section className="panel phase-pie-panel">
      <div className="section-head">
        <div>
          <h2>Expense category breakdown</h2>
          <p>
            Distribution of materials, salaries, subcontractors, equipment, and
            statutory permits.
          </p>
        </div>
        <Tag type="blue" size="sm">
          {isActual ? "Actual Incurred" : "Estimated Cost"}
        </Tag>
      </div>

      <div className="phase-pie-content">
        <div className="pie-chart-box">
          <svg
            className="svg-pie-chart"
            viewBox="0 0 230 230"
            style={{ width: "230px", height: "230px" }}
            aria-label="Category expenditure donut chart"
          >
            {totalValue === 0 ? (
              <circle
                cx={cx}
                cy={cy}
                r={(outerR + innerR) / 2}
                fill="none"
                stroke="#373c40"
                strokeWidth={outerR - innerR}
              />
            ) : (
              slices.map((slice) => {
                if (!slice.pathData) return null;
                const isHovered = hoveredIndex === slice.index;
                const isSelected = selectedCategory === slice.category;
                const shift = isHovered || isSelected ? 5 : 0;
                const tx = shift * Math.cos(slice.midAngle);
                const ty = shift * Math.sin(slice.midAngle);

                return (
                  <path
                    key={slice.category}
                    d={slice.pathData}
                    fill={slice.color}
                    transform={`translate(${tx}, ${ty})`}
                    className="pie-slice"
                    onMouseEnter={() => setHoveredIndex(slice.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() =>
                      onSelectCategory(
                        selectedCategory === slice.category
                          ? "All"
                          : slice.category,
                      )
                    }
                    style={{
                      opacity:
                        selectedCategory === "All" || isSelected || isHovered
                          ? 1
                          : 0.4,
                    }}
                  />
                );
              })
            )}

            <circle cx={cx} cy={cy} r={innerR - 2} fill="#181c1f" />

            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              className="pie-center-value"
            >
              ${activeHovered ? activeHovered.value : totalAmount}M
            </text>
            <text
              x={cx}
              y={cy + 16}
              textAnchor="middle"
              className="pie-center-label"
            >
              {activeHovered
                ? activeHovered.label
                : isActual
                  ? "Actual spent"
                  : "Phase estimate"}
            </text>
          </svg>
        </div>

        <div className="category-legend-list">
          {breakdown.map((cat) => {
            const isSelected = selectedCategory === cat.category;
            return (
              <div
                key={cat.category}
                className={`category-legend-item ${isSelected ? "active" : ""}`}
                onClick={() =>
                  onSelectCategory(isSelected ? "All" : cat.category)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectCategory(isSelected ? "All" : cat.category);
                  }
                }}
              >
                <div className="category-legend-meta">
                  <span
                    className="category-dot"
                    style={{ background: cat.color }}
                  />
                  <span>{cat.label}</span>
                </div>
                <div className="category-legend-values">
                  <strong>${cat.value}M</strong>
                  <span className="category-legend-pct">{cat.percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PhaseCostGraph({ project, selectedPhase, onSelectPhase }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const costs = getProjectPhaseCosts(project);
  const maxVal = Math.max(
    ...costs.map((c) => Math.max(c.estimate || 0, c.actual || 0)),
    10,
  );
  const chartHeight = 220;
  const chartWidth = 760;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const bandWidth = innerWidth / (costs.length || 1);
  const barWidth = Math.min(26, bandWidth * 0.36);

  const gridTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <section className="panel phase-graph-panel">
      <div className="section-head">
        <div>
          <h2>Lifecycle phases comparative expenditure</h2>
          <p>
            Estimate compared with actual expenditure across lifecycle phases.
            Click any phase to inspect details.
          </p>
        </div>
        <div className="chart-legend">
          <div className="chart-legend-item">
            <span
              className="chart-legend-color"
              style={{ background: "#8d969d" }}
            />
            <span>Estimate</span>
          </div>
          <div className="chart-legend-item">
            <span
              className="chart-legend-color"
              style={{ background: "#e7a63b" }}
            />
            <span>Actual</span>
          </div>
        </div>
      </div>

      <div className="phase-interactive-graph-wrap">
        <svg
          className="svg-cost-chart"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: "240px" }}
        >
          {gridTicks.map((pct) => {
            const y = paddingTop + innerHeight * (1 - pct);
            const val = Math.round(maxVal * pct);
            return (
              <g key={pct}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#373c40"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  fill="#a9b0b5"
                  fontSize="11"
                  textAnchor="end"
                  fontFamily='"IBM Plex Mono", monospace'
                >
                  ${val}M
                </text>
              </g>
            );
          })}

          {costs.map((c, i) => {
            const centerX = paddingLeft + i * bandWidth + bandWidth / 2;
            const estHeight = (c.estimate / maxVal) * innerHeight;
            const actHeight = (c.actual / maxVal) * innerHeight;
            const estY = paddingTop + innerHeight - estHeight;
            const actY = paddingTop + innerHeight - actHeight;
            const isHovered = hoveredIndex === i;
            const isSelected = selectedPhase === c.phase;

            return (
              <g
                key={c.phase}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSelectPhase(c.phase)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={paddingLeft + i * bandWidth + 4}
                  y={paddingTop - 8}
                  width={bandWidth - 8}
                  height={innerHeight + 14}
                  fill={
                    isSelected
                      ? "rgba(231, 166, 59, 0.12)"
                      : isHovered
                        ? "rgba(255, 255, 255, 0.04)"
                        : "transparent"
                  }
                  stroke={isSelected ? "var(--accent)" : "transparent"}
                  strokeWidth="1"
                  rx="6"
                />

                {isSelected && (
                  <polygon
                    points={`${centerX - 5},${paddingTop - 12} ${centerX + 5},${paddingTop - 12} ${centerX},${paddingTop - 6}`}
                    fill="var(--accent)"
                  />
                )}

                <rect
                  x={centerX - barWidth - 2}
                  y={estY}
                  width={barWidth}
                  height={Math.max(0, estHeight)}
                  fill="#8d969d"
                  rx="2"
                  ry="2"
                  className="cost-chart-bar"
                />

                <rect
                  x={centerX + 2}
                  y={actY}
                  width={barWidth}
                  height={Math.max(0, actHeight)}
                  fill="#e7a63b"
                  rx="2"
                  ry="2"
                  className="cost-chart-bar"
                />

                <text
                  x={centerX}
                  y={paddingTop + innerHeight + 20}
                  fill={isSelected ? "var(--accent)" : "#a9b0b5"}
                  fontWeight={isSelected ? "600" : "400"}
                  fontSize="11"
                  textAnchor="middle"
                >
                  {c.phase}
                </text>

                {isHovered && (
                  <g>
                    <rect
                      x={Math.max(10, Math.min(chartWidth - 140, centerX - 65))}
                      y={Math.max(5, Math.min(estY, actY) - 50)}
                      width="130"
                      height="44"
                      fill="#25292c"
                      stroke="#4b5155"
                      strokeWidth="1"
                      rx="4"
                    />
                    <text
                      x={
                        Math.max(10, Math.min(chartWidth - 140, centerX - 65)) +
                        10
                      }
                      y={Math.max(5, Math.min(estY, actY) - 50) + 16}
                      fill="#8d969d"
                      fontSize="11"
                    >
                      Estimate: ${c.estimate}M
                    </text>
                    <text
                      x={
                        Math.max(10, Math.min(chartWidth - 140, centerX - 65)) +
                        10
                      }
                      y={Math.max(5, Math.min(estY, actY) - 50) + 34}
                      fill="#e7a63b"
                      fontSize="11"
                    >
                      Actual: ${c.actual}M
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

export function PhaseExpenseLedger({
  project,
  expenditures,
  selectedPhase,
  selectedCategory,
  onSelectCategory,
  categories = [],
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedExpenditureId, setExpandedExpenditureId] = useState(null);

  const filtered = expenditures.filter((item) => {
    const matchesCat =
      selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      searchTerm.trim() === "" ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalEst =
    Math.round(filtered.reduce((s, i) => s + (i.estimate || 0), 0) * 10) / 10;
  const totalAct =
    Math.round(filtered.reduce((s, i) => s + (i.actual || 0), 0) * 10) / 10;
  const totalVar = Math.round((totalEst - totalAct) * 10) / 10;

  // Same category state as the pie chart: picking here highlights the slice, clicking a slice updates this
  const categoryOptions = [
    { value: "All", label: "All categories" },
    ...categories.map((category) => ({ value: category, label: category })),
  ];
  const activeCategoryColor =
    selectedCategory !== "All" ? CATEGORY_CONFIG[selectedCategory]?.color : null;

  return (
    <section className="panel phase-ledger-panel">
      <div className="section-head" style={{ padding: "18px 20px 0" }}>
        <div>
          <h2>Itemized expenses · {selectedPhase}</h2>
          <p>
            Line-item vouchers, contracts, materials, equipment, and statutory
            fees for this phase.
          </p>
        </div>
      </div>

      <div className="ledger-controls">
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search expenditure by title, vendor, ID, or category"
          ariaLabel="Filter expenses list"
          onReset={() => {
            setSearchTerm("");
            onSelectCategory("All");
          }}
          canReset={searchTerm.trim() !== "" || selectedCategory !== "All"}
          count={filtered.length}
          countLabel={`of ${expenditures.length} shown`}
        >
          <FilterSelect
            label="Filter by expense category"
            value={selectedCategory}
            onChange={onSelectCategory}
            options={categoryOptions}
            className={activeCategoryColor ? "is-active" : ""}
            style={activeCategoryColor ? { borderColor: activeCategoryColor } : undefined}
          />
        </FilterBar>
      </div>

      <div className="phase-ledger-table-wrap">
        <table className="phase-ledger-table">
          <thead>
            <tr>
              <th>Expenditure item / Scope</th>
              <th>Category</th>
              <th>Contractor / Vendor</th>
              <th className="num">Estimate</th>
              <th className="num">Actual spent</th>
              <th className="num">Variance</th>
              <th>Status</th>
              <th
                style={{ width: "36px", padding: "10px 8px" }}
                aria-label="Details"
              />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    padding: "32px",
                    color: "var(--muted)",
                  }}
                >
                  No expenditure records match the selected category or search
                  filter.
                </td>
              </tr>
            ) : (
              filtered.map((exp) => {
                const catCfg = CATEGORY_CONFIG[exp.category] || {
                  color: "#8d969d",
                  lightColor: "rgba(141,150,157,0.15)",
                };
                const isExpanded = expandedExpenditureId === exp.id;
                return (
                  <React.Fragment key={exp.id}>
                    <tr>
                      <td>
                        <strong style={{ color: "#f2f4f4" }}>
                          {exp.title}
                        </strong>
                      </td>
                      <td>
                        <span
                          className="category-badge"
                          style={{
                            background: catCfg.lightColor,
                            color: catCfg.color,
                            border: `1px solid ${catCfg.color}40`,
                          }}
                        >
                          {exp.category}
                        </span>
                      </td>
                      <td style={{ color: "#c8ced2" }}>{exp.vendor}</td>
                      <td className="num">${exp.estimate}M</td>
                      <td className="num">${exp.actual}M</td>
                      <td
                        className={`num ${exp.variance < 0 ? "negative" : "positive"}`}
                      >
                        {exp.variance >= 0 ? "+" : ""}$
                        {Math.abs(exp.variance).toFixed(1)}M
                      </td>
                      <td>
                        <StatusTag status={exp.status} />
                      </td>
                      <td style={{ textAlign: "center", padding: "8px 6px" }}>
                        <button
                          type="button"
                          className={`ledger-more-details-btn ${isExpanded ? "is-active" : ""}`}
                          onClick={() =>
                            setExpandedExpenditureId(isExpanded ? null : exp.id)
                          }
                          aria-expanded={isExpanded}
                          title={isExpanded ? "Hide details" : "More details"}
                          aria-label={
                            isExpanded ? "Hide details" : "More details"
                          }
                        >
                          <ChevronDown size={15} className="toggle-arrow" />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="ledger-material-drawer-row">
                        <td colSpan={8}>
                          <div className="simple-materials-list-wrap">
                            <span className="simple-materials-heading">
                              Expenditure details:
                            </span>
                            <div className="simple-materials-items">
                              <div className="simple-material-row">
                                <span className="mat-dot" />
                                <span className="mat-name">{exp.title}</span>
                                <span className="mat-qty">
                                  · Vendor:{" "}
                                  {exp.vendor || "Direct project operations"}
                                </span>
                                <span className="mat-qty">
                                  · Recorded:{" "}
                                  {exp.expenditureDate || "Baseline"}
                                </span>
                                <span className="mat-qty">
                                  · Category: {exp.category}
                                </span>
                                <span
                                  className={`mat-status-tag ${
                                    String(exp.status || "")
                                      .toLowerCase()
                                      .includes("incurred")
                                      ? "in-use"
                                      : "staged"
                                  }`}
                                >
                                  {exp.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3}>Subtotal ({filtered.length} items)</td>
                <td className="num">${totalEst}M</td>
                <td className="num">${totalAct}M</td>
                <td className={`num ${totalVar < 0 ? "negative" : "positive"}`}>
                  {totalVar >= 0 ? "+" : ""}${Math.abs(totalVar).toFixed(1)}M
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

export function CostOutlook({ project }) {
  const costs = getProjectPhaseCosts(project);
  const actual = costs.reduce((sum, phase) => sum + (phase.actual || 0), 0);
  const remaining = Math.max(0, (project.budget || 0) - actual);
  const committed = remaining * 0.7;
  const forecast =
    Math.max(project.budget || 0, actual) + (project.budget || 0) * 0.04;
  const pending = (project.budget || 0) * 0.015;
  return (
    <section className="control-section">
      <div className="section-head">
        <h2>Cost outlook</h2>
        <span>Mock forecast · USD</span>
      </div>
      <div className="control-costs">
        {[
          ["Approved budget", project.budget],
          ["Actual spent", actual],
          ["Outstanding commitments", committed],
          ["Forecast final cost", forecast],
          ["Forecast overrun", forecast - project.budget],
          ["Pending changes", pending],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{usdMillions(value)}</strong>
          </div>
        ))}
      </div>
      <p className="control-note">
        Commitments are unpaid orders. Pending changes are excluded from the
        final-cost forecast.
      </p>
      <DetailPanel
        showToggle={false}
        as="details"
        project={project}
        title="Monthly cost forecast and change register"
        sender="Cost controller"
        body={`Actual spend reconciles to the phase ledger. Outstanding orders: ${usdMillions(committed)}. Forecast includes remaining work and ${usdMillions(forecast - project.budget)} overrun; ${usdMillions(pending)} in unapproved changes is tracked separately.`}
      />
    </section>
  );
}

export function CostAnalysisPage({
  project,
  initialPhase = "Construction",
  isEmbedded = false,
  showOutlook = isEmbedded,
  onBack,
}) {
  const [selectedPhase, setSelectedPhase] = useState(initialPhase);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    if (initialPhase) {
      setSelectedPhase(initialPhase);
    }
  }, [initialPhase]);

  const costs = getProjectPhaseCosts(project);
  const currentCost = costs.find((c) => c.phase === selectedPhase) || {
    estimate: 0,
    actual: 0,
  };
  const variance =
    Math.round((currentCost.estimate - currentCost.actual) * 10) / 10;
  const isActual = currentCost.actual > 0;
  const totalAmount = isActual ? currentCost.actual : currentCost.estimate;

  const expenditures = getPhaseExpenditures(project, selectedPhase);
  const categoryBreakdown = getPhaseCategoryBreakdown(expenditures);

  const Container = isEmbedded ? "div" : "main";

  return (
    <Container
      className={`phase-cost-analysis-page ${isEmbedded ? "is-embedded" : "page"}`}
    >
      {!isEmbedded && onBack && (
        <button type="button" className="back" onClick={onBack}>
          <ArrowLeft size={17} /> Back to {project.name}
        </button>
      )}

      {!isEmbedded && (
        <div className="phase-cost-hero">
          <div className="hero-titles">
            <div className="title-line">
              <span className="technical-id">{project.id}</span>
              <Tag type="warm-gray" size="sm">
                Current Project Phase: {project.phase}
              </Tag>
            </div>
            <h1>{project.name} · Phase Cost & Expenditure Analysis</h1>
            <p>
              Interactive cross-phase comparative expenditure graph, category
              distribution (materials, salaries & labor, equipment & plant,
              subcontractors, permits & fees), and itemized expense ledger.
            </p>
          </div>
        </div>
      )}

      <section className="phase-cost-kpis">
        <div className="phase-cost-kpi-card">
          <span>Active Inspected Phase</span>
          <strong style={{ color: "var(--accent)" }}>{selectedPhase}</strong>
        </div>
        <div className="phase-cost-kpi-card">
          <span>Phase Estimate</span>
          <strong>${currentCost.estimate}M</strong>
        </div>
        <div className="phase-cost-kpi-card">
          <span>Actual Incurred</span>
          <strong>${currentCost.actual}M</strong>
        </div>
        <div className="phase-cost-kpi-card">
          <span>Variance</span>
          <strong className={variance < 0 ? "negative" : "positive"}>
            {variance >= 0 ? "+" : ""}${Math.abs(variance).toFixed(1)}M
          </strong>
        </div>
      </section>

      {/* 1. Graph with different phases */}
      <PhaseCostGraph
        project={project}
        selectedPhase={selectedPhase}
        onSelectPhase={(phase) => {
          setSelectedPhase(phase);
          setSelectedCategory("All");
        }}
      />

      {/* 2. Donut / Pie Chart & 3. List of Expenses */}
      <div className="phase-analytics-grid">
        <PhasePieChart
          breakdown={categoryBreakdown}
          totalAmount={totalAmount}
          isActual={isActual}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <PhaseExpenseLedger
          project={project}
          expenditures={expenditures}
          selectedPhase={selectedPhase}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          categories={categoryBreakdown
            .filter((cat) => cat.itemsCount > 0 || cat.category === selectedCategory)
            .map((cat) => cat.category)}
        />
      </div>
    </Container>
  );
}

export default CostAnalysisPage;
