import React from "react";
import { phases } from "./data.js";

export const money = (value, compact = false) =>
  compact
    ? `$${value.toFixed(value % 1 ? 1 : 0)}M`
    : new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

export const phaseIndex = (phase) => phases.indexOf(phase);

export const projectAliases = {
  "PRJ-2401": "PRJ-01",
};

export function resolveProjectId(id) {
  return projectAliases[id] || id;
}

export function Tag({ type, size = "sm", className = "", children }) {
  const typeClass = type ? `cds--tag--${type}` : "";
  return <span className={`cds--tag ${typeClass} ${className}`}>{children}</span>;
}

export function Button({
  kind = "primary",
  size = "md",
  onClick,
  renderIcon: RenderIcon,
  children,
  className = "",
}) {
  return (
    <button
      type="button"
      className={`cds--btn cds--btn--${kind} ${className}`}
      onClick={onClick}
    >
      {children}
      {RenderIcon && <RenderIcon size={16} />}
    </button>
  );
}

export function StatusTag({ status }) {
  return (
    <Tag className={`status-tag status-${status.toLowerCase().replaceAll(" ", "-")}`} size="sm">
      {status}
    </Tag>
  );
}

export function Progress({ value, label = true }) {
  return (
    <div className="progress-wrap">
      {label && (
        <div className="progress-label">
          <span>Overall progress</span>
          <strong>{value}%</strong>
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={`${value}% complete`}
      >
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
