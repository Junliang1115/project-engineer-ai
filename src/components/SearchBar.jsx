import React from "react";
import { Search, X } from "lucide-react";
import "../ProjectOverview.css";

/**
 * SearchBar
 * Highly customizable, modern search input with flexible section sizing,
 * glassmorphic design, smooth micro-interactions, and accessible controls.
 *
 * @param {string} value - Current search query value
 * @param {function} onChange - Standard change handler callback
 * @param {function} [onClear] - Optional callback when clear button is clicked
 * @param {string} [placeholder="Search..."] - Input placeholder text
 * @param {string} [ariaLabel] - Accessible label for screen readers
 * @param {string} [className=""] - Additional custom classes for wrapper
 * @param {string|number} [width] - Custom width (e.g. "320px", "100%", 300)
 * @param {string|number} [maxWidth] - Custom max-width (e.g. "480px", "none")
 * @param {string|number} [minWidth] - Custom min-width (e.g. "200px")
 * @param {"sm"|"md"|"lg"} [size="md"] - Visual size variant
 * @param {string} [shortcut] - Optional keyboard shortcut badge (e.g. "/", "⌘K")
 * @param {number} [iconSize] - Optional override icon size in px
 * @param {boolean} [disabled=false] - Whether input is disabled
 * @param {boolean} [autoFocus=false] - Whether input auto focuses
 * @param {object} [style] - Custom inline style object
 */
export function SearchBar({
  value = "",
  onChange,
  onClear,
  placeholder = "Search...",
  ariaLabel,
  className = "",
  width,
  maxWidth,
  minWidth,
  size = "md",
  shortcut,
  iconSize,
  disabled = false,
  autoFocus = false,
  style = {},
  id,
  ...rest
}) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: "" } });
    }
  };

  const defaultIconSize = size === "sm" ? 13 : size === "lg" ? 17 : 15;
  const resolvedIconSize = iconSize || defaultIconSize;

  const inlineStyles = {
    ...(width != null ? { width } : {}),
    ...(maxWidth != null ? { maxWidth } : {}),
    ...(minWidth != null ? { minWidth } : {}),
    ...style,
  };

  return (
    <label
      className={`search-bar-box search-bar-size-${size} ${className}`.trim()}
      style={inlineStyles}
    >
      <Search
        size={resolvedIconSize}
        className="search-bar-icon"
        aria-hidden="true"
      />
      <input
        type="text"
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        {...rest}
      />
      {Boolean(value) ? (
        <button
          type="button"
          className="search-bar-clear"
          onClick={handleClear}
          title="Clear search"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      ) : shortcut ? (
        <kbd className="search-bar-shortcut">{shortcut}</kbd>
      ) : null}
    </label>
  );
}

export default SearchBar;
