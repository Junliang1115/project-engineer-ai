import React, { useState } from "react";
import { Users, Forward, Calendar as CalendarBlank } from "lucide-react";
import { phases } from "./data.js";
import { Tag } from "./ProjectTokens.jsx";

export const WORKFORCE_PROFILES = {
  upstream: {
    id: "upstream",
    name: "Upstream & Offshore Facilities",
    sector: "Oil & Gas Upstream",
    description:
      "Deepwater drilling, subsea tiebacks, FPSO topsides processing, and offshore sour gas (H2S) safety crews.",
    categories: [
      {
        id: "subsea-drilling",
        name: "Subsea, Drilling & Well Interventions",
        totalHeadcount: 142,
        availableNow: 38,
        description: "IWCF-certified subsea BOP engineers, directional drillers, ROV tooling techs, and wellhead specialists.",
        skills: [
          {
            skill: "Subsea Blowout Preventer (BOP) Control Tech",
            cert: "IWCF Level 4 / API 16D",
            phase: "Construction",
            available: 7,
            total: 18,
            deployedTo: "Offshore Deepwater Drillship Alpha",
            status: "Available",
          },
          {
            skill: "Directional Drilling & MWD/LWD Field Engineer",
            cert: "IADC WellSharp / Halliburton Sperry",
            phase: "Construction",
            available: 6,
            total: 22,
            deployedTo: "High-Pressure Sour Gas Well S-04",
            status: "Constrained",
          },
          {
            skill: "Deepwater Workclass ROV Pilot & Tooling Tech",
            cert: "IMCA Class 1 / CSWIP 3.2U",
            phase: "Procurement",
            available: 11,
            total: 26,
            deployedTo: "Subsea Manifold FAT Staging",
            status: "Ready for deploy",
          },
          {
            skill: "Managed Pressure Drilling (MPD) Choke Operator",
            cert: "IADC MPD Specialist / API 16RCD",
            phase: "Design",
            available: 5,
            total: 16,
            deployedTo: "Dynamic Wellbore Hydraulics Spread",
            status: "Available",
          },
          {
            skill: "Subsea Production Tree & Wellhead Field Tech",
            cert: "API 6A / 17D Qualified",
            phase: "Handover",
            available: 9,
            total: 20,
            deployedTo: "Subsea Template Pre-Commissioning",
            status: "Ready for deploy",
          },
          {
            skill: "Geological Reservoir & Geomechanics Specialist",
            cert: "AAPG / SPE Certified",
            phase: "Concept",
            available: 4,
            total: 12,
            deployedTo: "Deepwater Basin Seismic Reservoir Model",
            status: "Available",
          },
        ],
      },
      {
        id: "offshore-topsides",
        name: "Offshore Topsides & Turbomachinery",
        totalHeadcount: 186,
        availableNow: 52,
        description: "Super-duplex piping leads, high-pressure separator technicians, and offshore gas turbine mechanics.",
        skills: [
          {
            skill: "Super-Duplex & Inconel 6G TIG Welder",
            cert: "ASME Section IX / 6G Alloy",
            phase: "Construction",
            available: 14,
            total: 45,
            deployedTo: "FPSO High-Pressure Flare Header",
            status: "Available",
          },
          {
            skill: "Gas Turbine & Centrifugal Compressor Lead",
            cert: "Nuovo Pignone / Solar Taurus Specialist",
            phase: "Construction",
            available: 8,
            total: 28,
            deployedTo: "Topsides Train 1 Compression Deck",
            status: "Constrained",
          },
          {
            skill: "Multiphase Export Pump & Heavy Rigging Specialist",
            cert: "OPITO Stage 3 Rigger / API 610",
            phase: "Procurement",
            available: 12,
            total: 32,
            deployedTo: "Yard Heavy-Lift Skid Integration",
            status: "Ready for deploy",
          },
          {
            skill: "Tri-Ethylene Glycol (TEG) Gas Dehydration Lead",
            cert: "OPITO Process Operations Level 3",
            phase: "Handover",
            available: 10,
            total: 25,
            deployedTo: "Topsides Gas Treating Skid",
            status: "Available",
          },
          {
            skill: "FPSO Marine Dynamic Positioning (DP-3) Officer",
            cert: "Nautical Institute DP Unlimited",
            phase: "Feasibility",
            available: 8,
            total: 20,
            deployedTo: "Turret Mooring Hydrodynamics Dossier",
            status: "Ready for deploy",
          },
        ],
      },
      {
        id: "offshore-safety",
        name: "HSE, Sour Gas (H2S) & Process Safety",
        totalHeadcount: 98,
        availableNow: 31,
        description: "Sour gas (H2S) breathing air supervisors, HAZOP/SIL certifiers, and offshore deluge inspectors.",
        skills: [
          {
            skill: "Sour Gas (H2S) Cascade Breathing Air Safety Lead",
            cert: "OPITO H2S / Confined Space Rescue",
            phase: "Construction",
            available: 9,
            total: 24,
            deployedTo: "High-Sulfur Wellhead Module Enclosure",
            status: "Available",
          },
          {
            skill: "HAZOP, LOPA & SIL Functional Safety Engineer",
            cert: "TÜV Rheinland FS Eng / IEC 61511",
            phase: "Design",
            available: 6,
            total: 16,
            deployedTo: "Quantitative Process Safety Review (QRA)",
            status: "Constrained",
          },
          {
            skill: "Offshore Deluge & Fire/Blast Wall Inspector",
            cert: "NFPA 15/25 Water Deluge Qualified",
            phase: "Handover",
            available: 8,
            total: 22,
            deployedTo: "Topsides Living Quarters Acceptance",
            status: "Ready for deploy",
          },
          {
            skill: "Environmental Marine Discharge & Flare Monitor",
            cert: "ISO 14001 / OSPAR Lead Auditor",
            phase: "Concept",
            available: 8,
            total: 18,
            deployedTo: "Offshore Environmental Impact Assessment",
            status: "Available",
          },
        ],
      },
    ],
  },
  downstream: {
    id: "downstream",
    name: "Midstream & Downstream (LNG & Refining)",
    sector: "Oil & Gas Midstream / Downstream",
    description:
      "LNG liquefaction trains, cryogenic full-containment tanks, cross-country pipelines, and petrochemical refinery turnarounds.",
    categories: [
      {
        id: "lng-cryogenics",
        name: "LNG Cryogenics & Liquefaction Processing",
        totalHeadcount: 164,
        availableNow: 47,
        description: "Mixed refrigerant compressor technicians, cryogenic cold box leads, and LNG marine loading arm techs.",
        skills: [
          {
            skill: "LNG Mixed Refrigerant (MR) Liquefaction Operator",
            cert: "LNG Process Operator Level 4",
            phase: "Construction",
            available: 10,
            total: 34,
            deployedTo: "Liquefaction Train 2 Pre-Cooling",
            status: "Available",
          },
          {
            skill: "Cryogenic Cold Box & MCHE Brazed Heat Exchanger Tech",
            cert: "ASME VIII Div 1 Cryogenics",
            phase: "Procurement",
            available: 7,
            total: 22,
            deployedTo: "Linde / APCI MCHE Factory Inspection",
            status: "Constrained",
          },
          {
            skill: "LNG Marine Loading Arm & Cryogenic Bunkering Tech",
            cert: "SIGTTO LNG Transfer Certified",
            phase: "Handover",
            available: 12,
            total: 28,
            deployedTo: "Export Jetty Berth 1 Cryo Header",
            status: "Ready for deploy",
          },
          {
            skill: "Boil-Off Gas (BOG) Compressor & Recondenser Tech",
            cert: "API 618 Reciprocating Compressor",
            phase: "Design",
            available: 9,
            total: 26,
            deployedTo: "Cryogenic Tank BOG Balance Study",
            status: "Available",
          },
          {
            skill: "Full-Containment 9% Ni-Steel Cryogenic Tank Welder",
            cert: "API 620 Appendix Q / 6G TIG",
            phase: "Construction",
            available: 9,
            total: 30,
            deployedTo: "160,000m³ LNG Cryo Tank Outer Shell",
            status: "Constrained",
          },
        ],
      },
      {
        id: "pipeline-scada",
        name: "Cross-Country Pipeline & SCADA Automation",
        totalHeadcount: 138,
        availableNow: 44,
        description: "Intelligent in-line smart pigging inspectors, automatic pipeline welders, and SIL-3 HIPPS protection leads.",
        skills: [
          {
            skill: "In-Line Inspection (ILI) Ultrasonic Smart Pigging Tech",
            cert: "ASNT NDT Level III UT/MFL",
            phase: "Handover",
            available: 11,
            total: 28,
            deployedTo: "42-Inch Gas Trunkline Baseline Pigging Run",
            status: "Available",
          },
          {
            skill: "Pipeline Automatic External Welder (Bug-and-Band)",
            cert: "API 1104 / Pipeline Automatic Welding",
            phase: "Construction",
            available: 14,
            total: 40,
            deployedTo: "Mountain Pass Pipeline Spread #2",
            status: "Available",
          },
          {
            skill: "High-Integrity Pressure Protection (HIPPS) Integrator",
            cert: "IEC 61508 / SIL 3 Functional Safety",
            phase: "Design",
            available: 6,
            total: 18,
            deployedTo: "Inlet Terminal Overpressure Skid Design",
            status: "Constrained",
          },
          {
            skill: "Mainline Block Valve (MLBV) Solar/Gas Actuator Tech",
            cert: "CompEx Ex01-Ex04 / API 6D",
            phase: "Procurement",
            available: 8,
            total: 24,
            deployedTo: "Remote Section Valve Station Deployment",
            status: "Ready for deploy",
          },
          {
            skill: "Pipeline SCADA Real-Time Transient Leak Detection Lead",
            cert: "API 1130 Computational LDS Specialist",
            phase: "Handover",
            available: 5,
            total: 14,
            deployedTo: "Central Pipeline Control Dispatch Center",
            status: "Constrained",
          },
        ],
      },
      {
        id: "refining-turnaround",
        name: "Petrochemical Refining & Turnaround",
        totalHeadcount: 155,
        availableNow: 49,
        description: "CompEx hazardous area electrical techs, hydrocracker catalyst leads, and Claus sulfur recovery specialists.",
        skills: [
          {
            skill: "CompEx Certified Hazardous Area Electrical Technician",
            cert: "CompEx Ex01-Ex04 / IECEx 05",
            phase: "Construction",
            available: 15,
            total: 42,
            deployedTo: "Hydrocracker Zone 1 ATEX Re-Instrumentation",
            status: "Available",
          },
          {
            skill: "Fluid Catalytic Cracking (FCCU) Regenerator Specialist",
            cert: "UOP/Axens Catalyst Licensed Operator",
            phase: "Handover",
            available: 8,
            total: 26,
            deployedTo: "FCC Catalyst Circulation Startup Crew",
            status: "Constrained",
          },
          {
            skill: "Claus Sulfur Recovery Unit (SRU) & Tail Gas Tech",
            cert: "Thermal Oxidizer Refractory Inspector",
            phase: "Construction",
            available: 10,
            total: 28,
            deployedTo: "SRU Sulfur Condenser Retubing Package",
            status: "Available",
          },
          {
            skill: "Hydrotreater High-Pressure Catalyst Handling Tech",
            cert: "Inert Confined Space Entry / OSHA 30",
            phase: "Procurement",
            available: 9,
            total: 25,
            deployedTo: "Reactor Presulfiding & Catalyst Loading",
            status: "Ready for deploy",
          },
          {
            skill: "Crude Distillation Column Tray Internals Rigger",
            cert: "ASME Section VIII Pressure Vessel Specialist",
            phase: "Design",
            available: 7,
            total: 20,
            deployedTo: "Vacuum Distillation Revamp Simulation",
            status: "Available",
          },
        ],
      },
    ],
  },
};

export function getProjectWorkforceTasks(project) {
  if (project?.workforce?.length) {
    return project.workforce;
  }

  const currentPhase = project?.phase || "Construction";
  const currentPhaseIdx = phases.indexOf(currentPhase) !== -1 ? phases.indexOf(currentPhase) : 4;

  const roleSpecs = {
    "TSK-100A": {
      workerType: "Geotechnical Drill Rig Specialist",
      spec: "API RP 2A marine geotech & core drilling",
      required: 4,
      available: 4,
      leadTime: "Phase completed",
    },
    "TSK-100B": {
      workerType: "Senior BIM Coordinator & Modeler",
      spec: "Revit Structures / Navisworks Clash / ISO 19650",
      required: 5,
      available: 5,
      leadTime: "Phase completed",
    },
    "TSK-100C": {
      workerType: "Procurement Expediter & SQA Inspector",
      spec: "Supplier Quality Assurance & FAT witness",
      required: 4,
      available: 4,
      leadTime: "Phase completed",
    },
    "TSK-101": {
      workerType: "Civil & Structural QC Inspector",
      spec: "CSWIP 3.1 / ACI Field Concrete Grade 1",
      required: 4,
      available: 4,
      leadTime: "Active on site",
    },
    "TSK-102": {
      workerType: "Certified Welder & Glazing Rigger",
      spec: "ASME IX / 6G alloy & Working at heights cert",
      required: 8,
      available: 5,
      leadTime: "Immediate hire • Week 38 onboarding",
    },
    "TSK-103": {
      workerType: "Mechanical Fitter & Alignment Lead",
      spec: "Rotating equipment laser alignment & API 610",
      required: 6,
      available: 4,
      leadTime: "Immediate hire • Week 40 onboarding",
    },
    "TSK-104": {
      workerType: "E&I Technician & Fire Suppression Tester",
      spec: "CompEx Ex01-04 / NFPA 13/20 water deluge qualified",
      required: 6,
      available: 3,
      leadTime: "Immediate hire • Week 42 onboarding",
    },
    "TSK-105": {
      workerType: "Terrazzo & Acoustic Substrate Specialist",
      spec: "High-traffic epoxy & acoustic isolation cert",
      required: 4,
      available: 4,
      leadTime: "Allocated internal crew",
    },
    "TSK-106": {
      workerType: "Lead Commissioning Engineer (BMS/SCADA)",
      spec: "Schneider EcoStruxure / BACnet IP / Modbus protocol",
      required: 4,
      available: 1,
      leadTime: "6 weeks advance lead time (Recruit by mid-Oct)",
    },
    "TSK-107": {
      workerType: "QA/QC Authority Commissioning Inspector",
      spec: "Statutory authority witness / NFPA 72 & local code",
      required: 3,
      available: 1,
      leadTime: "4 weeks advance lead time (Recruit by early Nov)",
    },
    "TSK-108": {
      workerType: "COBie & BIM Asset Data Specialist",
      spec: "ISO 19650 BIM Information Manager / Asset Tagging",
      required: 2,
      available: 2,
      leadTime: "Pre-allocated internal specialist",
    },
  };

  const genericWorkerTemplates = [
    ["Mechanical fitter", "Rotating equipment installation and alignment experience"],
    ["Certified welder", "ASME IX / 6G qualified for project pipe class"],
    ["E&I technician", "CompEx / hazardous area cable termination"],
    ["Commissioning engineer", "Pre-commissioning loop checks and FAT sign-off"],
    ["QA/QC inspector", "CSWIP / NDT coordination and inspection release"],
    ["HSE officer", "Permit to work, hot work and confined space control"],
  ];

  const rawTasks = project?.tasks && project.tasks.length > 0 ? project.tasks : [];

  return rawTasks.map((task, index) => {
    const taskPhase = task.phase || currentPhase;
    const taskPhaseIdx = phases.indexOf(taskPhase) !== -1 ? phases.indexOf(taskPhase) : currentPhaseIdx;
    const isPast = taskPhaseIdx < currentPhaseIdx;
    const isCurrent = taskPhaseIdx === currentPhaseIdx;
    const isNext = taskPhaseIdx === currentPhaseIdx + 1;
    const isFuture = taskPhaseIdx > currentPhaseIdx;

    const matched = roleSpecs[task.id];
    let workerType, spec, required, available, leadTime;

    if (matched) {
      workerType = matched.workerType;
      spec = matched.spec;
      required = matched.required;
      available = matched.available;
      leadTime = matched.leadTime;
    } else {
      const [templType, templSpec] = genericWorkerTemplates[index % genericWorkerTemplates.length];
      workerType = templType;
      spec = templSpec;
      required = 4 + (index % 3) * 2;
      available = isPast ? required : Math.max(0, required - ([3, 0, 2, 1][index % 4] || 0));
      leadTime = isPast
        ? "Completed"
        : isCurrent
          ? "Immediate hire"
          : `${4 + (index % 3) * 2} weeks advance lead time`;
    }

    const needToHire = Math.max(0, required - available);
    let status;
    if (isPast) {
      status = "Completed";
    } else if (isCurrent) {
      status = needToHire > 0 ? "Hire workers" : "Covered";
    } else {
      status = needToHire > 0 ? "Hire in advance" : "Covered";
    }

    return {
      id: task.id,
      task: task.title,
      phase: taskPhase,
      discipline: task.discipline || "General",
      phaseType: isCurrent ? "current" : isNext ? "next" : isPast ? "past" : "future",
      workerType,
      spec,
      required,
      available,
      needToHire,
      status,
      leadTime,
      isAdvanceHire: isFuture && needToHire > 0,
      isImmediateHire: isCurrent && needToHire > 0,
    };
  });
}

export function WorkforceOverview({ project }) {
  const currentPhase = project?.phase || "Construction";
  const currentPhaseIdx = phases.indexOf(currentPhase) !== -1 ? phases.indexOf(currentPhase) : 4;
  const nextPhase = phases[currentPhaseIdx + 1] || "Handover";
  const currentMilestone = project?.currentMilestone || project?.milestone || "M-04 Work package release";
  const nextMilestone = project?.nextMilestone || "M-05 Handover & Commissioning Gate";

  const allRows = getProjectWorkforceTasks(project);
  const [selectedPhase, setSelectedPhase] = useState("ALL");

  const filteredRows = selectedPhase === "ALL"
    ? allRows
    : allRows.filter((row) => row.phase === selectedPhase);

  // Grouped stats
  const currentRows = allRows.filter((r) => r.phase === currentPhase);
  const currentRequired = currentRows.reduce((sum, r) => sum + r.required, 0);
  const currentAvailable = currentRows.reduce((sum, r) => sum + r.available, 0);
  const currentToHire = currentRows.reduce((sum, r) => sum + r.needToHire, 0);

  const nextRows = allRows.filter((r) => r.phase === nextPhase);
  const nextRequired = nextRows.reduce((sum, r) => sum + r.required, 0);
  const nextAvailable = nextRows.reduce((sum, r) => sum + r.available, 0);
  const nextToHire = nextRows.reduce((sum, r) => sum + r.needToHire, 0);

  const totalToHireFiltered = filteredRows.reduce((sum, r) => sum + r.needToHire, 0);

  const immediateActions = allRows.filter((r) => r.isImmediateHire);
  const advanceActions = allRows.filter((r) => r.isAdvanceHire);
  const hiringActions = filteredRows.filter((r) => r.needToHire > 0);

  return (
    <section className="panel workforce-panel" aria-label="Site worker management">
      <div className="section-head workforce-head">
        <div>
          <div className="workforce-title-row">
            <h2>Site Worker Management</h2>
            <Tag type={currentToHire ? "red" : "teal"} size="sm">
              {currentToHire ? `${currentToHire} Workers needed (Current Phase)` : "Current phase covered"}
            </Tag>
            {nextToHire > 0 && (
              <Tag type="blue" size="sm">
                {nextToHire} Advance hires ({nextPhase})
              </Tag>
            )}
          </div>
          <p>
            Phase-by-phase workforce demand planning for {project?.name || "this project"}. Identify urgent hires in the current {currentPhase} phase and plan ahead for upcoming {nextPhase} milestone requirements.
          </p>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="workforce-summary-strip">
        <div className="workforce-kpi">
          <span>Current Phase</span>
          <strong>{currentPhase}</strong>
        </div>
        <div className="workforce-kpi highlight">
          <span>Workers Needed (Current)</span>
          <strong className="avail-accent">{currentToHire}</strong>
        </div>
        <div className="workforce-kpi highlight-blue">
          <span>Advance Hires ({nextPhase})</span>
          <strong className="advance-accent">{nextToHire}</strong>
        </div>
        <div className="workforce-kpi">
          <span>Advance Sourcing Window</span>
          <strong>4–6 Weeks</strong>
        </div>
      </div>

      {/* Strategic Readiness Cards */}
      <div className="workforce-readiness-grid">
        <article className="workforce-readiness-card">
          <div><Users size={18} /><span>Current phase urgent hire</span></div>
          <strong>{immediateActions[0]?.workerType || "No urgent shortage"}</strong>
          <p>
            {immediateActions[0]?.needToHire
              ? `${immediateActions[0].needToHire} more needed for ${immediateActions[0].task}.`
              : "Current phase task staffing is fully covered."}
          </p>
        </article>
        <article className="workforce-readiness-card">
          <div><Forward size={18} /><span>Next phase advance planning</span></div>
          <strong>{advanceActions[0]?.workerType || "Advance plan ready"}</strong>
          <p>
            {advanceActions.length
              ? `Source ${nextToHire} specialist roles for ${nextPhase} now to satisfy mandatory 4-6 week certification lead time.`
              : "Future phase talent pipeline is reserved."}
          </p>
        </article>
        <article className="workforce-readiness-card">
          <div><CalendarBlank size={18} /><span>Planning decision</span></div>
          <strong>Dual-track hiring pipeline</strong>
          <p>
            Lock site contractor agreements for {currentPhase} while issuing advance requisitions for {nextPhase} commissioning leads.
          </p>
        </article>
      </div>

      {/* Clickable Phase Progression Rail */}
      <section className="panel phase-panel workforce-phase-rail-panel" aria-label="Workforce phase progression filter">
        <div className="section-head">
          <div>
            <h2>Phase progression</h2>
            <p>Stage gate position across the project lifecycle. Click any phase to inspect tasks and workforce demand.</p>
          </div>
          <div className="phase-rail-actions">
            <span className="phase-count">
              {currentPhaseIdx + 1} / {phases.length}
            </span>
            <button
              type="button"
              className={`phase-all-toggle-btn ${selectedPhase === "ALL" ? "active" : ""}`}
              onClick={() => setSelectedPhase("ALL")}
              title="Show tasks for all lifecycle phases"
            >
              All phases ({allRows.length})
            </button>
          </div>
        </div>
        <ol className="phase-rail clickable-phase-rail">
          {phases.map((phase, i) => {
            const isCompleted = i < currentPhaseIdx;
            const isCurrent = i === currentPhaseIdx;
            const isNext = i === currentPhaseIdx + 1;
            const isSelected = selectedPhase === phase;

            const phaseTasks = allRows.filter((r) => r.phase === phase);
            const phaseHires = phaseTasks.reduce((s, r) => s + r.needToHire, 0);

            let statusLabel = "Remaining";
            if (isCompleted) statusLabel = "Completed";
            else if (isCurrent) statusLabel = phaseHires ? `Current • ${phaseHires} to hire` : "Current phase";
            else if (isNext) statusLabel = phaseHires ? `Next • ${phaseHires} advance` : "Next phase";

            return (
              <li
                key={phase}
                className={`phase-rail-item ${
                  isCompleted ? "complete" : isCurrent ? "current" : "remaining"
                } ${isSelected ? "selected" : ""} ${isNext ? "next-phase" : ""}`}
                onClick={() => setSelectedPhase(selectedPhase === phase ? "ALL" : phase)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedPhase(selectedPhase === phase ? "ALL" : phase);
                  }
                }}
                aria-pressed={isSelected}
                title={`Click to filter workforce tasks to ${phase}`}
              >
                <span className="phase-symbol">
                  {isCompleted ? "✓" : i + 1}
                </span>
                <div className="phase-meta">
                  <strong>{phase}</strong>
                  <small>{statusLabel}</small>
                  {phaseHires > 0 && (
                    <span className={`phase-hire-indicator ${isNext ? "indicator-advance" : "indicator-urgent"}`}>
                      +{phaseHires} {isNext ? "advance" : "hire"}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Task Worker Requirement Table */}
      <section className="workforce-dashboard-block">
        <div className="table-header-row">
          <h3>Task Worker Requirement Table</h3>
          <span className="table-count-sub">
            Showing {filteredRows.length} tasks {selectedPhase !== "ALL" ? `in ${selectedPhase}` : "across all phases"} • {totalToHireFiltered} roles to hire
          </span>
        </div>
        <div className="workforce-table-wrap">
          <table className="workforce-table site-worker-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Phase</th>
                <th>Worker Type Needed</th>
                <th>Spec / Certification</th>
                <th>Required</th>
                <th>Available</th>
                <th>Need to Hire</th>
                <th>Status</th>
                <th>Hiring Window / Lead Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={`${row.id || row.task}-${row.workerType}`}
                  className={
                    row.isImmediateHire
                      ? "row-immediate-hire"
                      : row.isAdvanceHire
                        ? "row-advance-hire"
                        : ""
                  }
                >
                  <td>
                    <strong>{row.task}</strong>
                    {row.id && <span className="table-sub-id">{row.id} • {row.discipline}</span>}
                  </td>
                  <td>
                    <span
                      className={`phase-tag-badge ${
                        row.phaseType === "current"
                          ? "badge-current"
                          : row.phaseType === "next"
                            ? "badge-next"
                            : "badge-past"
                      }`}
                    >
                      {row.phase}
                      {row.phaseType === "current" ? " (Current)" : row.phaseType === "next" ? " (Next)" : ""}
                    </span>
                  </td>
                  <td><strong>{row.workerType}</strong></td>
                  <td><span className="spec-text">{row.spec}</span></td>
                  <td className="mono">{row.required}</td>
                  <td className="mono">{row.available}</td>
                  <td>
                    {row.needToHire > 0 ? (
                      <span className={`hire-count-badge ${row.phaseType === "next" ? "advance" : "urgent"}`}>
                        +{row.needToHire} needed
                      </span>
                    ) : (
                      <span className="hire-count-zero">0</span>
                    )}
                  </td>
                  <td>
                    <Tag
                      type={
                        row.isImmediateHire
                          ? "red"
                          : row.isAdvanceHire
                            ? "blue"
                            : "teal"
                      }
                      size="sm"
                    >
                      {row.status}
                    </Tag>
                  </td>
                  <td>
                    <span className={`lead-time-tag ${row.isAdvanceHire ? "is-advance" : row.isImmediateHire ? "is-immediate" : ""}`}>
                      {row.leadTime}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Hiring Action List */}
      <section className="workforce-dashboard-block hiring-actions-block">
        <div className="hiring-actions-header">
          <h3>Hiring Action List</h3>
          <p className="hiring-actions-intro">
            Structured delivery pipeline showing immediate milestone staffing and advance recruitment for future milestones.
          </p>
        </div>

        {/* 1 & 2: Current Milestone & Immediate Hires (Non-red colors) */}
        <div className="hiring-milestone-group current-milestone-group">
          {/* 1. Show the current milestone: what phase */}
          <div className="milestone-indicator-bar current-indicator">
            <div className="milestone-indicator-left">
              <span className="milestone-phase-badge current">Phase: {currentPhase}</span>
              <div className="milestone-title-wrap">
                <span className="milestone-kicker">CURRENT MILESTONE</span>
                <h4 className="milestone-name">{currentMilestone}</h4>
              </div>
            </div>
            <div className="milestone-indicator-right">
              <span className="milestone-stats-pill">
                <strong>{currentToHire}</strong> immediate {currentToHire === 1 ? "hire" : "hires"} needed
              </span>
              <Tag type="teal" size="sm">Active Phase</Tag>
            </div>
          </div>

          {/* 2. Immediate hires cards (NOT in red colors - Emerald / Teal palette) */}
          <div className="hiring-cards-section">
            <div className="hiring-cards-subhead">
              <strong>Immediate Hires</strong>
              <span>{immediateActions.length} open {immediateActions.length === 1 ? "task" : "tasks"} • On-site onboarding</span>
            </div>
            {immediateActions.length ? (
              <div className="site-worker-actions-grid">
                {immediateActions.map((row) => (
                  <article key={`immediate-${row.id || row.task}-${row.workerType}`} className="hiring-card immediate-card-teal">
                    <div className="hiring-card-top">
                      <strong>Hire {row.needToHire} {row.workerType}</strong>
                      <span className="hiring-phase-pill teal-pill">{row.phase}</span>
                    </div>
                    <span className="hiring-spec">{row.spec}</span>
                    <p className="hiring-task-name">{row.task}</p>
                    <div className="hiring-footer">
                      <span className="hiring-lead-time teal-lead">{row.leadTime}</span>
                      <span className="hiring-status-badge teal-badge">Immediate onboarding</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-skills-msg">All roles for {currentMilestone} are staffed and covered.</p>
            )}
          </div>
        </div>

        {/* 3 & 4: Future Upcoming Milestone & Advance Hires */}
        <div className="hiring-milestone-group upcoming-milestone-group">
          {/* 3. The next is the future upcoming milestone and you show what the phase is */}
          <div className="milestone-indicator-bar upcoming-indicator">
            <div className="milestone-indicator-left">
              <span className="milestone-phase-badge upcoming">Upcoming Phase: {nextPhase}</span>
              <div className="milestone-title-wrap">
                <span className="milestone-kicker upcoming-kicker">FUTURE UPCOMING MILESTONE</span>
                <h4 className="milestone-name">{nextMilestone}</h4>
              </div>
            </div>
            <div className="milestone-indicator-right">
              <span className="milestone-stats-pill advance-pill">
                <strong>{nextToHire}</strong> advance {nextToHire === 1 ? "hire" : "hires"} planned
              </span>
              <Tag type="blue" size="sm">Advance Sourcing</Tag>
            </div>
          </div>

          {/* 4. The next row will be advance hires */}
          <div className="hiring-cards-section">
            <div className="hiring-cards-subhead">
              <strong>Advance Hires</strong>
              <span>{advanceActions.length} upcoming {advanceActions.length === 1 ? "task" : "tasks"} • Early talent pipeline</span>
            </div>
            {advanceActions.length ? (
              <div className="site-worker-actions-grid">
                {advanceActions.map((row) => (
                  <article key={`advance-${row.id || row.task}-${row.workerType}`} className="hiring-card advance-card">
                    <div className="hiring-card-top">
                      <strong>Hire {row.needToHire} {row.workerType}</strong>
                      <span className="hiring-phase-pill next-pill">{row.phase}</span>
                    </div>
                    <span className="hiring-spec">{row.spec}</span>
                    <p className="hiring-task-name">{row.task}</p>
                    <div className="hiring-footer">
                      <span className="hiring-lead-time advance-lead">{row.leadTime}</span>
                      <span className="hiring-status-badge advance-badge">Open early sourcing</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-skills-msg">No advance recruitment required for {nextPhase}.</p>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

export default WorkforceOverview;
