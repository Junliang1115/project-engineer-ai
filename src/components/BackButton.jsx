import React from "react";
import { ArrowLeft } from "lucide-react";
import "./BackButton.css";

/**
 * BackButton — icon-only back arrow used in detail page top bars (Request detail, Activity review).
 *
 * @param {() => void} onClick - Navigate back
 * @param {string} label - Accessible name and tooltip, e.g. "Back to requests"
 * @param {string} [className] - Extra CSS class
 */
export function BackButton({ onClick, label, className = "" }) {
  return (
    <button
      type="button"
      className={`back-button ${className}`.trim()}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <ArrowLeft size={18} aria-hidden="true" />
    </button>
  );
}

export default BackButton;
