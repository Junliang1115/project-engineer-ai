import React from "react";

export function Tag({ type, size = "sm", className = "", children }) {
  const typeClass = type ? `cds--tag--${type}` : "";
  return <span className={`cds--tag ${typeClass} ${className}`}>{children}</span>;
}

export function StatusTag({ status }) {
  const normalized = String(status || "").toLowerCase().replaceAll(" ", "-");
  return (
    <Tag className={`status-tag status-${normalized}`} size="sm">
      {status}
    </Tag>
  );
}

export default Tag;
