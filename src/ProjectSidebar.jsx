import React, { useEffect, useState } from "react";
import { LayoutDashboard, CalendarDays, CircleDollarSign, Truck, ShieldAlert, ListChecks, FileQuestion, MessagesSquare, BookOpen, ArrowLeft, Users } from "lucide-react";
import "./ProjectSidebar.css";

const links = [
  ["overview", "Overview", LayoutDashboard],
  ["milestones", "Milestones", CalendarDays],
  ["workforce", "Workforce", Users],
  ["costs", "Cost tracking", CircleDollarSign],
  ["deliveries", "Critical deliveries", Truck],
  ["risks", "Risks", ShieldAlert],
  ["tasks", "Task controls", ListChecks],
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
  useEffect(() => {
    const sync = () => setActive(readSection());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);
  return <div className="project-workspace">
    <aside className="project-section-sidebar">
      <button type="button" className="project-return" onClick={onBack}><ArrowLeft size={16} /> All projects</button>
      <div className="project-sidebar-title"><small>{project.id}</small><strong>{project.name}</strong><span>{project.phase}</span></div>
      <nav aria-label="Project sections">{links.map(([id, label, Icon]) =>
        <a key={id} href={`#${id}`} aria-current={active === id ? "page" : undefined} onClick={() => setActive(id)}>
          <Icon size={18} aria-hidden="true" /><span>{label}</span>
        </a>
      )}</nav>
      <div className="project-sidebar-progress"><span>Overall progress</span><strong>{project.progress}%</strong><progress value={project.progress} max="100" aria-label="Overall project progress" /></div>
    </aside>
    <main className="page detail-page project-section-content" key={`${project.id}-${active}`}>
      {sections[active]}
    </main>
  </div>;
}
