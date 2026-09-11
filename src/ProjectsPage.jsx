import React, { useState } from "react";
import { BarChart2 } from "lucide-react";

const projectRecords = [
  {
    id: "harbor-link",
    name: "Harbor Link Station",
    milestone: "M-04 Structural and facade coordination",
    health: "Warning",
    schedule: "8 days late",
    budget: "+6.4%",
    risk: "Medium-high",
    compliance: "2 checks open",
    owner: "Civil delivery team",
    summary: "Facade delivery is the main constraint. Resequencing MEP rough-in can protect the critical path while compliance evidence is completed.",
    milestones: [
      { name: "Design freeze", planned: "12 Sep", forecast: "12 Sep", status: "Done", impact: "None" },
      { name: "Procurement release", planned: "18 Sep", forecast: "20 Sep", status: "Watch", impact: "+1.2%" },
      { name: "Material delivery", planned: "02 Oct", forecast: "10 Oct", status: "At risk", impact: "+4.1%" },
      { name: "Site installation", planned: "08 Oct", forecast: "15 Oct", status: "At risk", impact: "+1.1%" },
    ],
    intelligence: [
      "Request fire-rated facade certificate before substitution review.",
      "Move night-shift workforce from non-critical glazing work.",
      "Compare revised aluminum pricing against approved contingency.",
    ],
  },
  {
    id: "tower-b",
    name: "Tower B Facade Package",
    milestone: "M-03 Procurement and delivery",
    health: "Critical",
    schedule: "14 days late",
    budget: "+9.8%",
    risk: "High",
    compliance: "4 checks open",
    owner: "Envelope package team",
    summary: "International shipping variance and certificate gaps are pushing the package into critical review.",
    milestones: [
      { name: "Shop drawing approval", planned: "09 Sep", forecast: "11 Sep", status: "Watch", impact: "+0.4%" },
      { name: "Factory QA", planned: "24 Sep", forecast: "30 Sep", status: "At risk", impact: "+2.6%" },
      { name: "Shipment release", planned: "28 Sep", forecast: "09 Oct", status: "At risk", impact: "+5.2%" },
    ],
    intelligence: [
      "Escalate customs document review.",
      "Confirm alternate supplier certificate equivalence.",
      "Prepare cost note for foreign exchange exposure.",
    ],
  },
  {
    id: "depot-expansion",
    name: "Depot Expansion Works",
    milestone: "M-02 Groundwork readiness",
    health: "On track",
    schedule: "2 days early",
    budget: "-1.3%",
    risk: "Low",
    compliance: "Clear",
    owner: "Site operations",
    summary: "Groundwork remains ahead of plan. Workforce mix is stable and materials are already staged.",
    milestones: [
      { name: "Permit review", planned: "05 Sep", forecast: "05 Sep", status: "Done", impact: "None" },
      { name: "Equipment mobilization", planned: "16 Sep", forecast: "14 Sep", status: "On track", impact: "-0.6%" },
      { name: "Groundwork start", planned: "20 Sep", forecast: "18 Sep", status: "On track", impact: "-0.7%" },
    ],
    intelligence: [
      "Keep current excavation crew allocation.",
      "Capture lesson learned on early permit package review.",
      "No immediate compliance blockers.",
    ],
  },
];

function ProjectsPage() {
  const [selectedProjectDetailId, setSelectedProjectDetailId] = useState(null);
  const selectedProject =
    projectRecords.find((project) => project.id === selectedProjectDetailId) ?? null;

  if (!selectedProject) {
    return (
      <section className="project-workstation" aria-label="Projects">
        <header className="chat-top-header project-page-header" aria-label="Projects header">
          <div className="chat-header-copy">
            <span className="header-topic-icon-wrap" aria-hidden="true">
              <BarChart2 size={13} />
            </span>
            <div className="header-title-container">
              <h1>Projects</h1>
            </div>
          </div>
          <span className="project-health-chip">Project Overview</span>
        </header>

        <div className="project-overview-page">
          <div className="project-overview-copy">
            <span className="project-kicker">Project Overview</span>
            <h2>Project portfolio</h2>
            <p>Select one project to open its individual project page with milestones, risks, compliance notes, and recommended next actions.</p>
          </div>

          <div className="project-overview-grid" aria-label="Project portfolio">
            {projectRecords.map((project) => (
              <article className="project-overview-card" key={project.id}>
                <div>
                  <span className="project-card-name">{project.name}</span>
                  <span className="project-card-milestone">{project.milestone}</span>
                </div>
                <div className="project-overview-metrics">
                  <ProjectMetric label="Schedule" value={project.schedule} />
                  <ProjectMetric label="Budget" value={project.budget} />
                  <ProjectMetric label="Risk" value={project.risk} />
                  <ProjectMetric label="Compliance" value={project.compliance} />
                </div>
                <button type="button" className="open-project-btn" onClick={() => setSelectedProjectDetailId(project.id)}>
                  Open Project
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="project-workstation" aria-label="Projects">
      <header className="chat-top-header project-page-header" aria-label="Projects header">
        <div className="chat-header-copy">
          <span className="header-topic-icon-wrap" aria-hidden="true">
            <BarChart2 size={13} />
          </span>
          <div className="header-title-container">
            <h1>{selectedProject.name}</h1>
          </div>
        </div>
        <span className="project-health-chip">{selectedProject.health}</span>
      </header>

      <div className="project-page-body">
        <main className="project-detail-panel project-detail-page">
          <button type="button" className="back-to-projects-btn" onClick={() => setSelectedProjectDetailId(null)}>
            Back to Projects
          </button>

          <section className="project-hero-card">
            <div>
              <span className="project-kicker">Individual Project Page</span>
              <h2>{selectedProject.name}</h2>
              <p>{selectedProject.summary}</p>
            </div>
            <div className="project-metric-grid">
              <ProjectMetric label="Schedule" value={selectedProject.schedule} />
              <ProjectMetric label="Budget" value={selectedProject.budget} />
              <ProjectMetric label="Risk" value={selectedProject.risk} />
              <ProjectMetric label="Compliance" value={selectedProject.compliance} />
            </div>
          </section>

          <section className="project-lower-grid">
            <article className="milestone-card">
              <div className="project-card-header">
                <h3>Milestone Tracker</h3>
                <span>{selectedProject.owner}</span>
              </div>
              <div className="milestone-table" role="table" aria-label="Milestone Tracker">
                <div className="milestone-row milestone-row-head" role="row">
                  <span>Milestone</span>
                  <span>Planned</span>
                  <span>Forecast</span>
                  <span>Status</span>
                  <span>Cost</span>
                </div>
                {selectedProject.milestones.map((milestone) => (
                  <div className="milestone-row" role="row" key={milestone.name}>
                    <span>{milestone.name}</span>
                    <span>{milestone.planned}</span>
                    <span>{milestone.forecast}</span>
                    <span>{milestone.status}</span>
                    <span>{milestone.impact}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="project-intelligence-card">
              <div className="project-card-header">
                <h3>Risk & Compliance</h3>
                <span>Agent summary</span>
              </div>
              <ul className="project-intelligence-list">
                {selectedProject.intelligence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </section>
        </main>
      </div>
    </section>
  );
}

function ProjectMetric({ label, value }) {
  return (
    <div className="project-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default ProjectsPage;
