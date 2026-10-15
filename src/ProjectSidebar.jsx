import React, { useEffect, useState } from "react";
import { LayoutDashboard, CalendarDays, CircleDollarSign, FileDiff, ShieldAlert, ListChecks, FileQuestion, MessagesSquare, BookOpen, ArrowLeft, PanelLeftClose, PanelLeftOpen, RotateCw } from "lucide-react";
import "./ProjectSidebar.css";

const links = [
  ["overview", "Overview", LayoutDashboard],
  ["milestones", "Milestones", CalendarDays],
  ["costs", "Cost tracking", CircleDollarSign],
  ["deliveries", "Change orders", FileDiff],
  ["risks", "Risks", ShieldAlert],
  ["queries", "Technical queries", FileQuestion],
  ["activity", "Activity log", MessagesSquare],
  ["issues", "Issues & lessons", BookOpen],
];
const readSection = () => {
  const value = window.location.hash.slice(1);
  return links.some(([id]) => id === value) ? value : "overview";
};

export default function ProjectSidebar({ project, onBack, sections }) {
  const [active, setActive] = useState(readSection);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  useEffect(() => {
    const sync = () => setActive(readSection());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);
  return <div className={`project-workspace ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
    {!isSidebarOpen && (
      <button type="button" className="project-sidebar-expand" onClick={() => setIsSidebarOpen(true)} aria-label="Expand project sidebar" title="Expand project sidebar">
        <PanelLeftOpen size={18} aria-hidden="true" />
      </button>
    )}
    <aside className={`project-section-sidebar ${isSidebarOpen ? "open" : "collapsed"}`} aria-hidden={!isSidebarOpen}>
      <header className="project-sidebar-header">
        <div className="project-sidebar-actions">
          <button type="button" className="project-return" onClick={onBack} aria-label="Back to projects"><ArrowLeft size={18} /></button>
          <button type="button" className="project-sidebar-collapse" onClick={() => setIsSidebarOpen(false)} aria-label="Collapse project sidebar" title="Collapse project sidebar"><PanelLeftClose size={18} aria-hidden="true" /></button>
        </div>
        <div className="project-sidebar-title"><small>{project.id}</small><strong>{project.name}</strong><span>{project.phase}</span></div>
      </header>
      <nav aria-label="Project sections">{links.map(([id, label, Icon]) =>
        <a key={id} href={`#${id}`} aria-current={active === id ? "page" : undefined} onClick={() => setActive(id)}>
          <Icon size={18} aria-hidden="true" /><span>{label}</span>
        </a>
      )}</nav>
      <div className="project-sidebar-bottom">
        <div className="project-sidebar-progress">
          <span>Overall progress</span>
          <strong>{project.progress}%</strong>
          <progress value={project.progress} max="100" aria-label="Overall project progress" />
        </div>
        <div className="project-sidebar-refresh">
          <span className="project-sidebar-refresh-label">
            <RotateCw size={11} className="refresh-icon" aria-hidden="true" />
            Latest refresh
          </span>
          <strong>{project.latestRefresh || "12 Sep 2026, 14:30"}</strong>
        </div>
      </div>
    </aside>
    <main className="page detail-page project-section-content" key={`${project.id}-${active}`}>
      {sections[active]}
    </main>
  </div>;
}
