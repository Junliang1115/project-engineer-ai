import React from "react";
import "../ProjectOverview.css";

export function Source({ project, title, sender, body }) {
  return (
    <details className="control-source">
      <summary>View source</summary>
      <div>
        <strong>{title}</strong>
        <p>{sender} · {project?.id} · 11 Sep 2026</p>
        <p>{body}</p>
      </div>
    </details>
  );
}

export default Source;
