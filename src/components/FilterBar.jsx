import React from "react";
import { RotateCcw } from "lucide-react";
import { SearchBar } from "./SearchBar.jsx";
import "./FilterBar.css";

/**
 * FilterBar
 * Toolbar above a list: [search] [filters...] [reset] [count].
 * The bar only renders controls — the page owns the filter state and
 * decides which items match.
 *
 * @param {string} [searchValue] - Current search query
 * @param {(value: string) => void} [onSearchChange] - Called with the new query ("" on clear).
 *   The search box is hidden when this is omitted.
 * @param {string} [placeholder] - Search placeholder text
 * @param {string} [ariaLabel] - Accessible label for the search input
 * @param {React.ReactNode} [children] - Filters (FilterSelect, FilterSegment, ...) after the search box
 * @param {() => void} [onReset] - Reset handler; the reset button shows when this and `canReset` are set
 * @param {boolean} [canReset=false] - Whether any filter is active
 * @param {string} [resetLabel="Reset"] - Reset button text
 * @param {number} [count] - Number of visible results; hidden when omitted
 * @param {string} [countLabel="shown"] - Text after the count
 * @param {string} [className] - Page-specific bar class
 */
export function FilterBar({
  searchValue = "",
  onSearchChange,
  placeholder,
  ariaLabel,
  children,
  onReset,
  canReset = false,
  resetLabel = "Reset",
  count,
  countLabel = "shown",
  className = "",
}) {
  return (
    <div className={`filter-bar ${onSearchChange ? "has-search" : ""} ${className}`.replace(/\s+/g, " ").trim()}>
      {onSearchChange && (
        <SearchBar
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={() => onSearchChange("")}
          placeholder={placeholder}
          ariaLabel={ariaLabel}
        />
      )}
      {children}
      {onReset && canReset && (
        <button type="button" className="filter-bar-reset" onClick={onReset} title="Reset all filters">
          <RotateCcw size={11} aria-hidden="true" />
          <span>{resetLabel}</span>
        </button>
      )}
      {count != null && <span className="filter-bar-count">{count} {countLabel}</span>}
    </div>
  );
}

const toOption = (option) =>
  typeof option === "object" && option !== null ? option : { value: option, label: option };

/**
 * FilterSelect
 * Dropdown filter for use inside FilterBar.
 *
 * @param {string} label - Accessible label (e.g. "Filter by phase")
 * @param {string} value - Selected value
 * @param {(value: string) => void} onChange - Called with the new value
 * @param {Array<string | {value: string, label: string}>} options - Choices, in display order
 * @param {string} [className] - Extra class for the select
 */
export function FilterSelect({ label, value, onChange, options = [], className = "", ...rest }) {
  return (
    <select
      className={`filter-select ${className}`.trim()}
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...rest}
    >
      {options.map(toOption).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * FilterSegment
 * Row of toggle buttons (one active at a time) for use inside FilterBar.
 *
 * @param {string} label - Accessible label for the group
 * @param {string} value - Active value
 * @param {(value: string) => void} onChange - Called with the clicked value
 * @param {Array<string | {value: string, label: string}>} options - Choices, in display order
 * @param {string} [className] - Extra class for the group
 */
export function FilterSegment({ label, value, onChange, options = [], className = "" }) {
  return (
    <div className={`filter-segment ${className}`.trim()} role="group" aria-label={label}>
      {options.map(toOption).map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? "is-active" : ""}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default FilterBar;
