import React, { useState } from "react";
import { Search, PanelLeftOpen, MessageSquare, BookOpen } from "lucide-react";
import { projects as projectRecords } from "./data.js";
import "./LessonsPage.css";

export default function LessonsPage({ topics, projects, messagesByTopic, onOpenChat, sidebarOpen, onExpandSidebar }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All projects");
  const entries = [
    ...topics.filter(topic => (messagesByTopic[topic.id] || []).some(message => message.role === "user")).map(topic => ({
      id: topic.id,
      type: "Technical queries",
      title: topic.title,
      project: projects.find(project => project.id === topic.projectId)?.name || "Unassigned",
      messages: messagesByTopic[topic.id],
      source: "Project conversation",
    })),
    ...projectRecords.flatMap(project => project.issues.filter(issue => issue.severity === "Learning").map(issue => ({
      id: `${project.id}-${issue.id}`,
      type: "Lessons",
      title: issue.description,
      project: project.name,
      source: `Lesson register / ${issue.id}`,
      task: issue.related_task_id,
      status: issue.status,
    }))),
  ];
  const filtered = entries.filter(entry => (kind === "All" || entry.type === kind)
    && (projectFilter === "All projects" || entry.project === projectFilter)
    && `${entry.title} ${entry.project} ${entry.source} ${(entry.messages || []).map(message => message.body).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="lessons-page" aria-label="Lessons and technical queries">
    <header className="lessons-heading">
      {!sidebarOpen && <button type="button" onClick={onExpandSidebar} aria-label="Expand sidebar" title="Expand sidebar"><PanelLeftOpen size={18} /></button>}
      <div><h1>Lessons</h1><p>Technical queries &amp; lessons learned</p></div><span>Mock project records</span>
    </header>
    <div className="lessons-toolbar">
      <label className="lessons-search"><Search size={17} aria-hidden="true" /><input aria-label="Search knowledge records" placeholder="Search queries, lessons, or sources" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <select aria-label="Filter by project" value={projectFilter} onChange={event => setProjectFilter(event.target.value)}><option>All projects</option>{[...new Set(entries.map(entry => entry.project))].map(name => <option key={name}>{name}</option>)}</select>
    </div>
    <div className="lessons-filters" role="group" aria-label="Record type">{["All", "Technical queries", "Lessons"].map(type => <button type="button" key={type} aria-pressed={kind === type} onClick={() => setKind(type)}>{type} <span>{entries.filter(entry => type === "All" || entry.type === type).length}</span></button>)}</div>
    <p className="lessons-count" aria-live="polite">{filtered.length} records</p>
    <div className="lessons-records">{filtered.map(entry => <details key={entry.id} className="lesson-record">
      <summary><span className="lesson-record-icon">{entry.type === "Lessons" ? <BookOpen size={18} /> : <MessageSquare size={18} />}</span><span><strong>{entry.title}</strong><small>{entry.project} · {entry.type === "Lessons" ? "Lesson" : "Technical query"} · {entry.source}</small></span></summary>
      <div className="lesson-record-body">{entry.messages ? <>
        {entry.messages.map((message, index) => <div className="lesson-message" key={message.id || index}><strong>{message.name || (message.role === "user" ? "Engineer" : "Assistant")}</strong><p>{message.body}</p></div>)}
        <button type="button" onClick={() => onOpenChat(entry.id)}><MessageSquare size={15} /> Open conversation</button>
      </> : <><p>{entry.title}</p><dl><dt>Status</dt><dd>{entry.status}</dd><dt>Related task</dt><dd>{entry.task || "Not linked"}</dd><dt>Source</dt><dd>{entry.source}</dd></dl></>}</div>
    </details>)}</div>
    {!filtered.length && <div className="lessons-empty"><BookOpen size={28} /><h2>No matching records</h2><button type="button" onClick={() => { setQuery(""); setKind("All"); setProjectFilter("All projects"); }}>Clear filters</button></div>}
  </section>;
}
