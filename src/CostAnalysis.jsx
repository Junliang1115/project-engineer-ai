import React, { useState, useEffect } from "react";
import { Forward, ArrowLeft, Search as MagnifyingGlass, ChevronDown, X } from "lucide-react";
import { phases } from "./data.js";
import { Tag, StatusTag } from "./ProjectTokens.jsx";
import { Source } from "./components/Source.jsx";
import "./ProjectOverview.css";

const usdMillions = (value) => `$${value.toFixed(1)}M`;

export const CATEGORY_CONFIG = {
  Materials: {
    label: "Materials",
    color: "#3b82f6",
    lightColor: "rgba(59, 130, 246, 0.15)",
  },
  "Salaries & Labor": {
    label: "Salaries & Labor",
    color: "#10b981",
    lightColor: "rgba(16, 185, 129, 0.15)",
  },
  Subcontractors: {
    label: "Subcontractors",
    color: "#8b5cf6",
    lightColor: "rgba(139, 92, 246, 0.15)",
  },
  "Equipment & Plant": {
    label: "Equipment & Plant",
    color: "#f59e0b",
    lightColor: "rgba(245, 158, 11, 0.15)",
  },
  "Permits & Fees": {
    label: "Permits & Fees",
    color: "#06b6d4",
    lightColor: "rgba(6, 182, 212, 0.15)",
  },
};

export const PHASE_MATERIALS = {
  Concept: [
    {
      id: "MAT-C01",
      name: "Architectural 3D Scale Models & High-Density Foam",
      type: "Modeling & Prototype",
      spec: "1:200 Scale / High-Density Polyurethane & Laser-cut Acrylic",
      status: "In Use on Site",
      activeWorkPackage: "Concept massing & stakeholder design reviews",
      quantity: "14 assemblies",
      consumedQty: "14 assemblies",
      percentConsumed: 100,
      allocatedCost: 0.12,
      incurredCost: 0.12,
      supplier: "KPF Design Partners",
      millCert: "CERT-MOD-882",
      complianceStandard: "ISO 9001 / Client Milestone Review",
    },
    {
      id: "MAT-C02",
      name: "Topographical Survey Targets & Field Consumables",
      type: "Geospatial Materials",
      spec: "LIDAR reflective prisms & GPS geodetic benchmark stakes",
      status: "In Use on Site",
      activeWorkPackage: "Utility boundary survey & site grid alignment",
      quantity: "85 units",
      consumedQty: "85 units",
      percentConsumed: 100,
      allocatedCost: 0.08,
      incurredCost: 0.08,
      supplier: "Apex Geospatial Ltd",
      millCert: "GEO-SURV-102",
      complianceStandard: "RICS Guidance / Ordinance Survey datum",
    },
  ],
  Feasibility: [
    {
      id: "MAT-F01",
      name: "Bentonite Drilling Slurry (Sodium Montmorillonite)",
      type: "Geotechnical Slurry",
      spec: "API Spec 13A Section 9 / High-viscosity drilling grade",
      status: "Completed / Stabilized",
      activeWorkPackage: "Exploratory boreholes BH-01 to BH-08 stabilization",
      quantity: "340 MT",
      consumedQty: "340 MT",
      percentConsumed: 100,
      allocatedCost: 0.28,
      incurredCost: 0.28,
      supplier: "GeoSupply Industrial",
      millCert: "QC-BEN-771",
      complianceStandard: "API Spec 13A / ASTM D5890",
    },
    {
      id: "MAT-F02",
      name: "Borehole Steel Temporary Casings (150mm & 200mm)",
      type: "Core Casings",
      spec: "ASTM A53 Grade B seamless carbon steel casing",
      status: "Completed / Stabilized",
      activeWorkPackage: "Soil stratification & groundwater core sampling",
      quantity: "420 m",
      consumedQty: "420 m",
      percentConsumed: 100,
      allocatedCost: 0.22,
      incurredCost: 0.22,
      supplier: "Civic Ground Engineering",
      millCert: "CAS-CS-202",
      complianceStandard: "BS EN 1997-2 / Eurocode 7 Geotech",
    },
  ],
  Design: [
    {
      id: "MAT-D01",
      name: "Double-Glazed Acoustic Cladding Test Specimen",
      type: "Facade Mockup",
      spec: "Low-E Acoustic Laminated / U-value 1.1 W/m²K, Rw 42dB",
      status: "Testing In Progress",
      activeWorkPackage: "Acoustic laboratory sound transmission & thermal cycling test",
      quantity: "120 m²",
      consumedQty: "120 m²",
      percentConsumed: 100,
      allocatedCost: 0.35,
      incurredCost: 0.35,
      supplier: "Saint-Gobain Architectural",
      millCert: "LAB-SG-4410",
      complianceStandard: "ASTM E283 / EN 12150-1 / CWCT Standard",
    },
    {
      id: "MAT-D02",
      name: "Thermal Break Aluminum Mullion Sections (6063-T6)",
      type: "Facade Framing",
      spec: "Polyamide thermal strut insulated extruded profiles",
      status: "Specification Approved",
      activeWorkPackage: "Wind tunnel boundary-layer deflection modeling",
      quantity: "650 m",
      consumedQty: "480 m",
      percentConsumed: 74,
      allocatedCost: 0.28,
      incurredCost: 0.28,
      supplier: "Schüco International",
      millCert: "CERT-AL-902",
      complianceStandard: "EN 755-9 / BS EN 12020",
    },
  ],
  Procurement: [
    {
      id: "MAT-P01",
      name: "Structural Heavy Steel Sections (Grade S355JR)",
      type: "Structural Metals",
      spec: "EN 10025-2 hot-rolled wide-flange beams & column sections",
      status: "Procured & Staged at Port",
      activeWorkPackage: "Primary superstructure column & transfer truss package",
      quantity: "2,400 MT",
      consumedQty: "1,450 MT",
      percentConsumed: 60,
      allocatedCost: 2.8,
      incurredCost: 2.1,
      supplier: "ArcelorMittal Industrial",
      millCert: "MILL-AM-88301",
      complianceStandard: "EN 10025-2 / CE & UKCA Certified",
    },
    {
      id: "MAT-P02",
      name: "High-Yield Deformed Rebar Steel (Grade B500B)",
      type: "Reinforcement Steel",
      spec: "BS 4449:2005 Grade B500B high ductility ribbed bars",
      status: "Procured & Batch Tested",
      activeWorkPackage: "Foundation mat, pile caps & core shear walls",
      quantity: "3,200 MT",
      consumedQty: "2,100 MT",
      percentConsumed: 66,
      allocatedCost: 2.4,
      incurredCost: 1.8,
      supplier: "ArcelorMittal Industrial",
      millCert: "CARES-CERT-7731",
      complianceStandard: "BS 4449 / CARES Approved",
    },
  ],
  Construction: [
    {
      id: "MAT-C101",
      name: "C50/60 High-Strength Ready-Mix Concrete",
      type: "Concrete & Mixes",
      spec: "BS EN 206-1 / 50 MPa characteristic strength, low heat CEM III/A",
      status: "In Use on Site",
      activeWorkPackage: "Suspended Floor Slabs L04-L06 & Core Shear Walls (Task TSK-01)",
      quantity: "14,800 m³",
      consumedQty: "9,450 m³",
      percentConsumed: 64,
      allocatedCost: 2.4,
      incurredCost: 1.8,
      supplier: "Titan Concrete & Steel Solutions",
      millCert: "BATCH-TC-2026-088",
      complianceStandard: "BS EN 206-1 / ISO 9001 / Batch QA Pass",
      isLive: true,
      lastDelivery: "Today, 07:45 AM (8 mixer trucks dispatched)",
    },
    {
      id: "MAT-C102",
      name: "Grade 500B High-Yield Deformed Rebar (16mm - 32mm)",
      type: "Reinforcement Steel",
      spec: "BS 4449:2005 Grade B500B high-ductility ribbed rebar",
      status: "In Use on Site",
      activeWorkPackage: "Rebar cage pre-fabrication & shear link fixing on Level 5 deck",
      quantity: "1,850 MT",
      consumedQty: "1,220 MT",
      percentConsumed: 66,
      allocatedCost: 1.9,
      incurredCost: 1.3,
      supplier: "ArcelorMittal Industrial",
      millCert: "MILL-AM-9941-B",
      complianceStandard: "BS 4449 / CARES Approved Mill Certificate",
      isLive: true,
      lastDelivery: "Yesterday, 16:20 (Bundle lot #500B-44)",
    },
    {
      id: "MAT-C103",
      name: "S355JR Heavy Flange Structural Steel Columns & Girders",
      type: "Structural Metals",
      spec: "EN 10025-2 Grade S355JR fabricated box columns & transfer plate girders",
      status: "In Use on Site",
      activeWorkPackage: "Podium Transfer Floor Framing & Tower Core Splice Joints",
      quantity: "920 MT",
      consumedQty: "580 MT",
      percentConsumed: 63,
      allocatedCost: 2.1,
      incurredCost: 1.4,
      supplier: "Titan Concrete & Steel Solutions",
      millCert: "EN10025-S355-667",
      complianceStandard: "EN 1090-2 Execution Class EXC3",
      isLive: true,
      lastDelivery: "2 days ago (Flatbed delivery Lot 12)",
    },
    {
      id: "MAT-C104",
      name: "Double-Glazed Low-E Acoustic Curtain Wall Unitized Panels",
      type: "Cladding & Glazing",
      spec: "ASTM E283 / EN 12150-1 tempered acoustic laminated glass (U-value 1.1 W/m²K)",
      status: "Staged on Site",
      activeWorkPackage: "Tower B East Elevation Bracket Anchoring & Unitized Installation",
      quantity: "4,500 m²",
      consumedQty: "1,600 m²",
      percentConsumed: 36,
      allocatedCost: 1.6,
      incurredCost: 0.8,
      supplier: "Saint-Gobain Architectural Glass",
      millCert: "SG-CW-BATCH-402",
      complianceStandard: "CWCT Class 1 / EN 13501-1 Fire Class A2-s1,d0",
      isLive: true,
      lastDelivery: "3 days ago (Staged on L02 logistics staging bay)",
    },
    {
      id: "MAT-C105",
      name: "High-Flow Non-Shrink Cementitious Baseplate Grout",
      type: "Chemicals & Grouts",
      spec: "ASTM C1107 / CRD-C 621 Grade C dual-expansion precision grout",
      status: "In Use on Site",
      activeWorkPackage: "Tower column baseplate leveling & precast column pocket injection",
      quantity: "65 MT",
      consumedQty: "42 MT",
      percentConsumed: 65,
      allocatedCost: 0.22,
      incurredCost: 0.15,
      supplier: "Sika Construction Chemicals",
      millCert: "SIKA-GROUT-902",
      complianceStandard: "ASTM C1107 / ETA-15/0020",
      isLive: true,
      lastDelivery: "Yesterday, 11:30 AM (Pallet lot #SK-331)",
    },
  ],
  Handover: [
    {
      id: "MAT-H01",
      name: "Architectural Interior Acoustic Perforated Ceiling Panels",
      type: "Finishes",
      spec: "NRC 0.85 fire-rated mineral fiber ceiling system with concealed grid",
      status: "Procured & Staged",
      activeWorkPackage: "Lobby & main concourse acoustic finishes",
      quantity: "3,800 m²",
      consumedQty: "1,200 m²",
      percentConsumed: 32,
      allocatedCost: 0.45,
      incurredCost: 0.18,
      supplier: "Apex Interior Elements",
      millCert: "CERT-ARM-118",
      complianceStandard: "ASTM E84 Class A / EN 13964",
    },
    {
      id: "MAT-H02",
      name: "Intumescent Firestop Sealant & Pipe Penetration Collars",
      type: "Life Safety Sealants",
      spec: "UL 1479 / 2-hour and 4-hour fire endurance elastomeric sealants",
      status: "In Use on Site",
      activeWorkPackage: "MEP riser floor penetration compartmentation sealing",
      quantity: "1,250 tubes & 380 collars",
      consumedQty: "820 tubes",
      percentConsumed: 65,
      allocatedCost: 0.18,
      incurredCost: 0.12,
      supplier: "Hilti Fire Protection",
      millCert: "HILTI-FS-401",
      complianceStandard: "UL 1479 / BS 476 Part 20",
    },
  ],
};

export const DEFAULT_PHASE_COSTS = [
  { phase: "Concept", estimate: 8.0, actual: 7.8 },
  { phase: "Feasibility", estimate: 14.0, actual: 14.2 },
  { phase: "Design", estimate: 24.0, actual: 26.5 },
  { phase: "Procurement", estimate: 42.0, actual: 44.1 },
  { phase: "Construction", estimate: 43.2, actual: 36.8 },
  { phase: "Handover", estimate: 8.0, actual: 2.4 },
];

export function getProjectPhaseCosts(project) {
  const existing = project?.costs || [];
  return phases.map((phaseName) => {
    const found = existing.find(
      (c) => c.phase && c.phase.toLowerCase() === phaseName.toLowerCase()
    );
    const fallback = DEFAULT_PHASE_COSTS.find((d) => d.phase === phaseName) || {
      phase: phaseName,
      estimate: 10,
      actual: 8,
    };
    if (found && (found.estimate > 0 || found.actual > 0)) {
      return {
        phase: phaseName,
        estimate: found.estimate,
        actual: found.actual,
      };
    }
    return fallback;
  });
}

export function getPhaseMaterials(project, phase) {
  const materialsList = PHASE_MATERIALS[phase] || PHASE_MATERIALS.Construction;
  return materialsList;
}

export function getPhaseExpenditures(project, phase) {
  const costs = getProjectPhaseCosts(project);
  const cost = costs.find((c) => c.phase === phase) || { estimate: 0, actual: 0 };
  const est = cost.estimate || 0;
  const act = cost.actual || 0;

  const templates = {
    Concept: [
      {
        id: "EXP-C01",
        title: "Topographical LIDAR scans & utility mapping",
        category: "Subcontractors",
        vendor: "Apex Geospatial Ltd",
        share: 0.22,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-C02",
        title: "Concept architectural massing & 3D scale models",
        category: "Materials",
        vendor: "KPF Design Partners",
        share: 0.15,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-C03",
        title: "Lead design architects & structural directors payroll",
        category: "Salaries & Labor",
        vendor: "In-house Core Engineering",
        share: 0.32,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-C04",
        title: "Geotechnical testing rig & mobile sonic sounders lease",
        category: "Equipment & Plant",
        vendor: "Geotech Instruments Corp",
        share: 0.16,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-C05",
        title: "Municipal zoning appraisal & pre-planning permit fees",
        category: "Permits & Fees",
        vendor: "City Development Authority",
        share: 0.15,
        status: act > 0 ? "Incurred" : "Forecast",
      },
    ],
    Feasibility: [
      {
        id: "EXP-F01",
        title: "Borehole exploratory drilling & geotechnical core sampling",
        category: "Subcontractors",
        vendor: "Civic Ground Engineering",
        share: 0.26,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-F02",
        title: "Core sample casings, bentonite slurry & field consumables",
        category: "Materials",
        vendor: "GeoSupply Industrial",
        share: 0.14,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-F03",
        title: "Senior geotechnical analysts & cost QS team salaries",
        category: "Salaries & Labor",
        vendor: "In-house Project Controls",
        share: 0.28,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-F04",
        title: "Hydraulic rotary drill rig & soil press equipment rental",
        category: "Equipment & Plant",
        vendor: "HeavyHire International",
        share: 0.18,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-F05",
        title: "Environmental impact statutory filing & planning clearances",
        category: "Permits & Fees",
        vendor: "Metropolitan Planning Bureau",
        share: 0.14,
        status: act > 0 ? "Incurred" : "Forecast",
      },
    ],
    Design: [
      {
        id: "EXP-D01",
        title: "Acoustic mockups, thermal glass & cladding test specimens",
        category: "Materials",
        vendor: "Saint-Gobain Architectural",
        share: 0.18,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-D02",
        title: "BIM coordinators, structural engineers & MEP staff payroll",
        category: "Salaries & Labor",
        vendor: "Foster & Partners Engineering",
        share: 0.34,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-D03",
        title: "Specialist boundary-layer wind tunnel testing contract",
        category: "Subcontractors",
        vendor: "RWDI Wind Engineers",
        share: 0.24,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-D04",
        title: "High-spec BIM modeling workstations & 3D scanner rentals",
        category: "Equipment & Plant",
        vendor: "TechLease Infrastructure",
        share: 0.12,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-D05",
        title: "Professional Engineer (PE) stamp certifications & building licenses",
        category: "Permits & Fees",
        vendor: "State Board of Engineers & City Licensing",
        share: 0.12,
        status: act > 0 ? "Incurred" : "Forecast",
      },
    ],
    Procurement: [
      {
        id: "EXP-P01",
        title: "Structural steel mill order & rebar reinforcement supply",
        category: "Materials",
        vendor: "ArcelorMittal Industrial",
        share: 0.46,
        status: act > 0 ? "Incurred" : "Committed",
      },
      {
        id: "EXP-P02",
        title: "Procurement buyers, supply chain expeditors & QA payroll",
        category: "Salaries & Labor",
        vendor: "Global Sourcing Team",
        share: 0.18,
        status: act > 0 ? "Incurred" : "Committed",
      },
      {
        id: "EXP-P03",
        title: "International freight logistics forwarding & stevedoring",
        category: "Subcontractors",
        vendor: "Maersk Global Logistics",
        share: 0.16,
        status: act > 0 ? "Incurred" : "Committed",
      },
      {
        id: "EXP-P04",
        title: "Dockside gantry cranes & heavy flatbed transporter leasing",
        category: "Equipment & Plant",
        vendor: "Port Equipment Services",
        share: 0.12,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-P05",
        title: "Customs import duty tariffs & marine cargo insurance bonds",
        category: "Permits & Fees",
        vendor: "Customs Bureau & Lloyd's Syndicate",
        share: 0.08,
        status: act > 0 ? "Incurred" : "Forecast",
      },
    ],
    Construction: [
      {
        id: "EXP-C10",
        title: "High-strength C50 ready-mix concrete, rebar & structural steel",
        category: "Materials",
        vendor: "Titan Concrete & Steel Solutions",
        share: 0.38,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-C11",
        title: "Site superintendents, safety engineers & trade crews payroll",
        category: "Salaries & Labor",
        vendor: "Direct Site Operations Payroll",
        share: 0.22,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-C12",
        title: "Deep substructure excavation & diaphragm wall trade contract",
        category: "Subcontractors",
        vendor: "Keller Foundation Systems",
        share: 0.20,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-C13",
        title: "Twin luffing-jib tower cranes & concrete boom pumps rental",
        category: "Equipment & Plant",
        vendor: "Select Plant Hire Ltd",
        share: 0.14,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-C14",
        title: "Municipal street closure, heavy-haul permits & environmental monitoring",
        category: "Permits & Fees",
        vendor: "Department of Transportation & EPA",
        share: 0.06,
        status: act > 0 ? "Incurred" : "Forecast",
      },
    ],
    Handover: [
      {
        id: "EXP-H01",
        title: "Final architectural touch-up finishes, hardware & wayfinding signs",
        category: "Materials",
        vendor: "Apex Interior Elements",
        share: 0.15,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-H02",
        title: "Closeout managers, QA/QC punchlist engineers & facilities team salaries",
        category: "Salaries & Labor",
        vendor: "Project Handover Management",
        share: 0.25,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-H03",
        title: "Testing, Adjusting & Balancing (TAB) mechanical commissioning",
        category: "Subcontractors",
        vendor: "National Commissioning Bureau",
        share: 0.32,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-H04",
        title: "Thermal imaging cameras, airflow meters & load bank rentals",
        category: "Equipment & Plant",
        vendor: "Instrument Hire Co",
        share: 0.14,
        status: act > 0 ? "Incurred" : "Forecast",
      },
      {
        id: "EXP-H05",
        title: "Certificate of Occupancy (CO) statutory approvals & fire marshal stamps",
        category: "Permits & Fees",
        vendor: "Bureau Veritas & Municipal Fire Dept",
        share: 0.14,
        status: act > 0 ? "Incurred" : "Forecast",
      },
    ],
  };

  const list = templates[phase] || templates.Construction;

  return list.map((item) => {
    const itemEst = Math.round(est * item.share * 10) / 10;
    const itemAct = act > 0 ? Math.round(act * item.share * 10) / 10 : 0;
    const variance = Math.round((itemEst - itemAct) * 10) / 10;

    return {
      ...item,
      estimate: itemEst,
      actual: itemAct,
      variance,
    };
  });
}

export function getPhaseCategoryBreakdown(expenditures) {
  const categories = [
    "Materials",
    "Salaries & Labor",
    "Subcontractors",
    "Equipment & Plant",
    "Permits & Fees",
  ];
  const totalActual = expenditures.reduce((sum, item) => sum + (item.actual || 0), 0);
  const totalEstimate = expenditures.reduce((sum, item) => sum + (item.estimate || 0), 0);
  const baseTotal = totalActual > 0 ? totalActual : totalEstimate;

  return categories.map((catKey) => {
    const config = CATEGORY_CONFIG[catKey] || { label: catKey, color: "#9ca3af", lightColor: "rgba(156,163,175,0.15)" };
    const items = expenditures.filter((i) => i.category === catKey);
    const catEstimate = Math.round(items.reduce((s, i) => s + (i.estimate || 0), 0) * 10) / 10;
    const catActual = Math.round(items.reduce((s, i) => s + (i.actual || 0), 0) * 10) / 10;
    const value = totalActual > 0 ? catActual : catEstimate;
    const percentage = baseTotal > 0 ? Math.round((value / baseTotal) * 100) : 0;

    return {
      category: catKey,
      label: config.label,
      color: config.color,
      lightColor: config.lightColor,
      itemsCount: items.length,
      estimate: catEstimate,
      actual: catActual,
      value,
      percentage,
    };
  });
}

export function CostChart({ project, onExploreMore }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isExploring, setIsExploring] = useState(false);
  const [activePhase, setActivePhase] = useState(project.phase || "Construction");

  const costs = getProjectPhaseCosts(project);
  const maxVal = Math.max(...costs.map((c) => Math.max(c.estimate || 0, c.actual || 0)), 10);
  const chartHeight = 220;
  const chartWidth = 700;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const bandWidth = innerWidth / (costs.length || 1);
  const barWidth = Math.min(22, bandWidth * 0.35);

  const gridTicks = [0, 0.25, 0.5, 0.75, 1];

  const activeCost = costs.find((c) => c.phase === activePhase) || { estimate: 0, actual: 0 };
  const activeVariance = Math.round((activeCost.estimate - activeCost.actual) * 10) / 10;
  const expenditures = getPhaseExpenditures(project, activePhase);

  const handleExploreClick = () => {
    if (onExploreMore) {
      onExploreMore(activePhase);
    } else {
      setIsExploring(!isExploring);
    }
  };

  return (
    <section className="panel chart-panel">
      <div className="section-head">
        <div>
          <h2>Cost by phase</h2>
          <p>Estimate compared with actual expenditure, USD millions.</p>
        </div>
        <div className="cost-section-actions">
          <button
            type="button"
            className="cost-explore-btn"
            onClick={handleExploreClick}
            aria-label="Explore more phase cost breakdown"
            title="Explore more"
          >
            <Forward size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="chart">
        <svg
          className="svg-cost-chart"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: "260px" }}
        >
          {gridTicks.map((pct) => {
            const y = paddingTop + innerHeight * (1 - pct);
            const val = Math.round(maxVal * pct);
            return (
              <g key={pct}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#373c40"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  fill="#a9b0b5"
                  fontSize="11"
                  textAnchor="end"
                  fontFamily='"IBM Plex Mono", monospace'
                >
                  ${val}M
                </text>
              </g>
            );
          })}

          {costs.map((c, i) => {
            const centerX = paddingLeft + i * bandWidth + bandWidth / 2;
            const estHeight = (c.estimate / maxVal) * innerHeight;
            const actHeight = (c.actual / maxVal) * innerHeight;
            const estY = paddingTop + innerHeight - estHeight;
            const actY = paddingTop + innerHeight - actHeight;
            const isHovered = hoveredIndex === i;
            const isSelected = activePhase === c.phase;

            return (
              <g
                key={c.phase}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => setActivePhase(c.phase)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={paddingLeft + i * bandWidth + 4}
                  y={paddingTop}
                  width={bandWidth - 8}
                  height={innerHeight}
                  fill={
                    isSelected && isExploring
                      ? "rgba(231, 166, 59, 0.12)"
                      : isHovered
                        ? "rgba(255, 255, 255, 0.04)"
                        : "transparent"
                  }
                  rx="4"
                />

                <rect
                  x={centerX - barWidth - 2}
                  y={estY}
                  width={barWidth}
                  height={Math.max(0, estHeight)}
                  fill="#8d969d"
                  rx="2"
                  ry="2"
                  className="cost-chart-bar"
                />

                <rect
                  x={centerX + 2}
                  y={actY}
                  width={barWidth}
                  height={Math.max(0, actHeight)}
                  fill="#e7a63b"
                  rx="2"
                  ry="2"
                  className="cost-chart-bar"
                />

                <text
                  x={centerX}
                  y={paddingTop + innerHeight + 20}
                  fill={isSelected && isExploring ? "var(--accent)" : "#a9b0b5"}
                  fontWeight={isSelected && isExploring ? "600" : "400"}
                  fontSize="11"
                  textAnchor="middle"
                >
                  {c.phase}
                </text>

                {isHovered && (
                  <g>
                    <rect
                      x={Math.max(10, Math.min(chartWidth - 140, centerX - 65))}
                      y={Math.max(5, Math.min(estY, actY) - 50)}
                      width="130"
                      height="44"
                      fill="#25292c"
                      stroke="#4b5155"
                      strokeWidth="1"
                      rx="4"
                    />
                    <text
                      x={Math.max(10, Math.min(chartWidth - 140, centerX - 65)) + 10}
                      y={Math.max(5, Math.min(estY, actY) - 50) + 16}
                      fill="#8d969d"
                      fontSize="11"
                    >
                      Estimate: ${c.estimate}M
                    </text>
                    <text
                      x={Math.max(10, Math.min(chartWidth - 140, centerX - 65)) + 10}
                      y={Math.max(5, Math.min(estY, actY) - 50) + 34}
                      fill="#e7a63b"
                      fontSize="11"
                    >
                      Actual: ${c.actual}M
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        <div className="chart-legend">
          <div className="chart-legend-item">
            <span className="chart-legend-color" style={{ background: "#8d969d" }} />
            <span>Estimate</span>
          </div>
          <div className="chart-legend-item">
            <span className="chart-legend-color" style={{ background: "#e7a63b" }} />
            <span>Actual</span>
          </div>
        </div>
      </div>

      {isExploring && (
        <div className="cost-exploration-panel" aria-label={`Cost breakdown for ${activePhase}`}>
          <div className="phase-cost-nav" role="tablist" aria-label="Select phase to explore">
            {phases.map((p) => {
              const pCost = costs.find((c) => c.phase === p);
              const isSelected = activePhase === p;
              return (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`phase-cost-tab ${isSelected ? "active" : ""}`}
                  onClick={() => setActivePhase(p)}
                >
                  <span className="phase-cost-tab-name">{p}</span>
                  <span className="phase-cost-tab-amount">
                    {pCost ? `$${pCost.actual > 0 ? pCost.actual : pCost.estimate}M` : "-"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="phase-explore-summary">
            <div className="phase-summary-card">
              <span>Phase</span>
              <strong>{activePhase}</strong>
            </div>
            <div className="phase-summary-card">
              <span>Estimate</span>
              <strong>${activeCost.estimate}M</strong>
            </div>
            <div className="phase-summary-card">
              <span>Actual spent</span>
              <strong>${activeCost.actual}M</strong>
            </div>
            <div className="phase-summary-card">
              <span>Variance</span>
              <strong className={activeVariance < 0 ? "negative" : "positive"}>
                {activeVariance >= 0 ? "+" : ""}${Math.abs(activeVariance).toFixed(1)}M
              </strong>
            </div>
          </div>

          <div className="phase-expenditure-table-wrap">
            <table className="phase-expenditure-table">
              <thead>
                <tr>
                  <th>Expenditure item / Scope</th>
                  <th>Category</th>
                  <th>Contractor / Vendor</th>
                  <th className="num">Estimate</th>
                  <th className="num">Actual spent</th>
                  <th className="num">Variance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {expenditures.map((exp) => (
                  <tr key={exp.id}>
                    <td>
                      <strong>{exp.title}</strong>
                      <small>{exp.id}</small>
                    </td>
                    <td>{exp.category}</td>
                    <td>{exp.vendor}</td>
                    <td className="num">${exp.estimate}M</td>
                    <td className="num">${exp.actual}M</td>
                    <td className={`num ${exp.variance < 0 ? "negative" : "positive"}`}>
                      {exp.variance >= 0 ? "+" : ""}${Math.abs(exp.variance).toFixed(1)}M
                    </td>
                    <td>
                      <StatusTag status={exp.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export function PhasePieChart({ breakdown, totalAmount, isActual, selectedCategory, onSelectCategory }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const cx = 115;
  const cy = 115;
  const outerR = 95;
  const innerR = 58;

  const totalValue = breakdown.reduce((sum, b) => sum + b.value, 0);

  let currentAngle = -Math.PI / 2;
  const slices = breakdown.map((cat, i) => {
    const fraction = totalValue > 0 ? cat.value / totalValue : 0;
    const sliceAngle = Math.min(fraction * 2 * Math.PI, 2 * Math.PI - 0.0001);
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle += sliceAngle;

    const midAngle = startAngle + sliceAngle / 2;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);

    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

    const pathData =
      sliceAngle <= 0.001
        ? ""
        : `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;

    return {
      ...cat,
      index: i,
      fraction,
      midAngle,
      pathData,
    };
  });

  const activeHovered = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <section className="panel phase-pie-panel">
      <div className="section-head">
        <div>
          <h2>Expense category breakdown</h2>
          <p>Distribution of materials, salaries, subcontractors, equipment, and statutory permits.</p>
        </div>
        <Tag type="blue" size="sm">
          {isActual ? "Actual Incurred" : "Estimated Cost"}
        </Tag>
      </div>

      <div className="pie-chart-box">
        <svg
          className="svg-pie-chart"
          viewBox="0 0 230 230"
          style={{ width: "230px", height: "230px" }}
          aria-label="Category expenditure donut chart"
        >
          {totalValue === 0 ? (
            <circle
              cx={cx}
              cy={cy}
              r={(outerR + innerR) / 2}
              fill="none"
              stroke="#373c40"
              strokeWidth={outerR - innerR}
            />
          ) : (
            slices.map((slice) => {
              if (!slice.pathData) return null;
              const isHovered = hoveredIndex === slice.index;
              const isSelected = selectedCategory === slice.category;
              const shift = isHovered || isSelected ? 5 : 0;
              const tx = shift * Math.cos(slice.midAngle);
              const ty = shift * Math.sin(slice.midAngle);

              return (
                <path
                  key={slice.category}
                  d={slice.pathData}
                  fill={slice.color}
                  transform={`translate(${tx}, ${ty})`}
                  className="pie-slice"
                  onMouseEnter={() => setHoveredIndex(slice.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() =>
                    onSelectCategory(selectedCategory === slice.category ? "All" : slice.category)
                  }
                  style={{
                    opacity:
                      selectedCategory === "All" || isSelected || isHovered ? 1 : 0.4,
                  }}
                />
              );
            })
          )}

          <circle cx={cx} cy={cy} r={innerR - 2} fill="#181c1f" />

          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="pie-center-value"
          >
            ${activeHovered ? activeHovered.value : totalAmount}M
          </text>
          <text
            x={cx}
            y={cy + 16}
            textAnchor="middle"
            className="pie-center-label"
          >
            {activeHovered
              ? activeHovered.label
              : isActual
                ? "Actual spent"
                : "Phase estimate"}
          </text>
        </svg>
      </div>

      <div className="category-legend-list">
        {breakdown.map((cat) => {
          const isSelected = selectedCategory === cat.category;
          return (
            <div
              key={cat.category}
              className={`category-legend-item ${isSelected ? "active" : ""}`}
              onClick={() =>
                onSelectCategory(isSelected ? "All" : cat.category)
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onSelectCategory(isSelected ? "All" : cat.category);
                }
              }}
            >
              <div className="category-legend-meta">
                <span className="category-dot" style={{ background: cat.color }} />
                <span>{cat.label}</span>
              </div>
              <div className="category-legend-values">
                <strong>${cat.value}M</strong>
                <span className="category-legend-pct">{cat.percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function PhaseCostGraph({ project, selectedPhase, onSelectPhase }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const costs = getProjectPhaseCosts(project);
  const maxVal = Math.max(...costs.map((c) => Math.max(c.estimate || 0, c.actual || 0)), 10);
  const chartHeight = 220;
  const chartWidth = 760;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const bandWidth = innerWidth / (costs.length || 1);
  const barWidth = Math.min(26, bandWidth * 0.36);

  const gridTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <section className="panel phase-graph-panel">
      <div className="section-head">
        <div>
          <h2>Lifecycle phases comparative expenditure</h2>
          <p>Estimate compared with actual expenditure across lifecycle phases. Click any phase to inspect details.</p>
        </div>
        <div className="chart-legend">
          <div className="chart-legend-item">
            <span className="chart-legend-color" style={{ background: "#8d969d" }} />
            <span>Estimate</span>
          </div>
          <div className="chart-legend-item">
            <span className="chart-legend-color" style={{ background: "#e7a63b" }} />
            <span>Actual</span>
          </div>
        </div>
      </div>

      <div className="phase-cost-nav" role="tablist" aria-label="Select phase to explore">
        {phases.map((p) => {
          const pCost = costs.find((c) => c.phase === p);
          const isSelected = selectedPhase === p;
          return (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`phase-cost-tab ${isSelected ? "active" : ""}`}
              onClick={() => onSelectPhase(p)}
            >
              <span className="phase-cost-tab-name">{p}</span>
              <span className="phase-cost-tab-amount">
                {pCost ? `$${pCost.actual > 0 ? pCost.actual : pCost.estimate}M` : "-"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="phase-interactive-graph-wrap">
        <svg
          className="svg-cost-chart"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: "240px" }}
        >
          {gridTicks.map((pct) => {
            const y = paddingTop + innerHeight * (1 - pct);
            const val = Math.round(maxVal * pct);
            return (
              <g key={pct}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#373c40"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  fill="#a9b0b5"
                  fontSize="11"
                  textAnchor="end"
                  fontFamily='"IBM Plex Mono", monospace'
                >
                  ${val}M
                </text>
              </g>
            );
          })}

          {costs.map((c, i) => {
            const centerX = paddingLeft + i * bandWidth + bandWidth / 2;
            const estHeight = (c.estimate / maxVal) * innerHeight;
            const actHeight = (c.actual / maxVal) * innerHeight;
            const estY = paddingTop + innerHeight - estHeight;
            const actY = paddingTop + innerHeight - actHeight;
            const isHovered = hoveredIndex === i;
            const isSelected = selectedPhase === c.phase;

            return (
              <g
                key={c.phase}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSelectPhase(c.phase)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={paddingLeft + i * bandWidth + 4}
                  y={paddingTop - 8}
                  width={bandWidth - 8}
                  height={innerHeight + 14}
                  fill={
                    isSelected
                      ? "rgba(231, 166, 59, 0.12)"
                      : isHovered
                        ? "rgba(255, 255, 255, 0.04)"
                        : "transparent"
                  }
                  stroke={isSelected ? "var(--accent)" : "transparent"}
                  strokeWidth="1"
                  rx="6"
                />

                {isSelected && (
                  <polygon
                    points={`${centerX - 5},${paddingTop - 12} ${centerX + 5},${paddingTop - 12} ${centerX},${paddingTop - 6}`}
                    fill="var(--accent)"
                  />
                )}

                <rect
                  x={centerX - barWidth - 2}
                  y={estY}
                  width={barWidth}
                  height={Math.max(0, estHeight)}
                  fill="#8d969d"
                  rx="2"
                  ry="2"
                  className="cost-chart-bar"
                />

                <rect
                  x={centerX + 2}
                  y={actY}
                  width={barWidth}
                  height={Math.max(0, actHeight)}
                  fill="#e7a63b"
                  rx="2"
                  ry="2"
                  className="cost-chart-bar"
                />

                <text
                  x={centerX}
                  y={paddingTop + innerHeight + 20}
                  fill={isSelected ? "var(--accent)" : "#a9b0b5"}
                  fontWeight={isSelected ? "600" : "400"}
                  fontSize="11"
                  textAnchor="middle"
                >
                  {c.phase}
                </text>

                {isHovered && (
                  <g>
                    <rect
                      x={Math.max(10, Math.min(chartWidth - 140, centerX - 65))}
                      y={Math.max(5, Math.min(estY, actY) - 50)}
                      width="130"
                      height="44"
                      fill="#25292c"
                      stroke="#4b5155"
                      strokeWidth="1"
                      rx="4"
                    />
                    <text
                      x={Math.max(10, Math.min(chartWidth - 140, centerX - 65)) + 10}
                      y={Math.max(5, Math.min(estY, actY) - 50) + 16}
                      fill="#8d969d"
                      fontSize="11"
                    >
                      Estimate: ${c.estimate}M
                    </text>
                    <text
                      x={Math.max(10, Math.min(chartWidth - 140, centerX - 65)) + 10}
                      y={Math.max(5, Math.min(estY, actY) - 50) + 34}
                      fill="#e7a63b"
                      fontSize="11"
                    >
                      Actual: ${c.actual}M
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

export function PhaseExpenseLedger({ project, expenditures, selectedPhase, selectedCategory, onSelectCategory }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedMaterialId, setExpandedMaterialId] = useState(null);

  const phaseMaterials = getPhaseMaterials(project, selectedPhase);

  const filtered = expenditures.filter((item) => {
    const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      searchTerm.trim() === "" ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalEst = Math.round(filtered.reduce((s, i) => s + (i.estimate || 0), 0) * 10) / 10;
  const totalAct = Math.round(filtered.reduce((s, i) => s + (i.actual || 0), 0) * 10) / 10;
  const totalVar = Math.round((totalEst - totalAct) * 10) / 10;

  return (
    <section className="panel phase-ledger-panel">
      <div className="section-head" style={{ padding: "18px 20px 0" }}>
        <div>
          <h2>Itemized expenses · {selectedPhase}</h2>
          <p>Line-item vouchers, contracts, materials, equipment, and statutory fees for this phase.</p>
        </div>
        <span>{filtered.length} expenses</span>
      </div>

      <div className="ledger-controls">
        <div className="ledger-search-container">
          <label className="ledger-search-box">
            <MagnifyingGlass size={15} className="ledger-search-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search expenses by scope, contractor, vendor, or voucher ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Filter expenses list"
            />
            {searchTerm && (
              <button
                type="button"
                className="ledger-search-clear"
                onClick={() => setSearchTerm("")}
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </label>
          {selectedCategory !== "All" && (
            <div className="ledger-active-category-pill">
              <span>Category: <strong>{selectedCategory}</strong></span>
              <button
                type="button"
                onClick={() => onSelectCategory("All")}
                title="Clear category filter"
                aria-label="Clear category filter"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="phase-ledger-table-wrap">
        <table className="phase-ledger-table">
          <thead>
            <tr>
              <th>Expenditure item / Scope</th>
              <th>Category</th>
              <th>Contractor / Vendor</th>
              <th className="num">Estimate</th>
              <th className="num">Actual spent</th>
              <th className="num">Variance</th>
              <th>Status</th>
              <th style={{ width: "36px", padding: "10px 8px" }} aria-label="Details" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                  No expenditure records match the selected category or search filter.
                </td>
              </tr>
            ) : (
              filtered.map((exp) => {
                const catCfg = CATEGORY_CONFIG[exp.category] || { color: "#8d969d", lightColor: "rgba(141,150,157,0.15)" };
                const isMaterialCat = exp.category === "Materials";
                const isExpanded = expandedMaterialId === exp.id;
                return (
                  <React.Fragment key={exp.id}>
                    <tr>
                      <td>
                        <strong style={{ color: "#f2f4f4" }}>{exp.title}</strong>
                        <small style={{ fontFamily: '"IBM Plex Mono", monospace', color: "var(--muted)", display: "block", marginTop: "2px" }}>
                          {exp.id}
                        </small>
                      </td>
                      <td>
                        <span
                          className="category-badge"
                          style={{
                            background: catCfg.lightColor,
                            color: catCfg.color,
                            border: `1px solid ${catCfg.color}40`,
                          }}
                        >
                          {exp.category}
                        </span>
                      </td>
                      <td style={{ color: "#c8ced2" }}>{exp.vendor}</td>
                      <td className="num">${exp.estimate}M</td>
                      <td className="num">${exp.actual}M</td>
                      <td className={`num ${exp.variance < 0 ? "negative" : "positive"}`}>
                        {exp.variance >= 0 ? "+" : ""}${Math.abs(exp.variance).toFixed(1)}M
                      </td>
                      <td>
                        <StatusTag status={exp.status} />
                      </td>
                      <td style={{ textAlign: "center", padding: "8px 6px" }}>
                        {isMaterialCat && (
                          <button
                            type="button"
                            className={`ledger-more-details-btn ${isExpanded ? "is-active" : ""}`}
                            onClick={() => setExpandedMaterialId(isExpanded ? null : exp.id)}
                            aria-expanded={isExpanded}
                            title={isExpanded ? "Hide details" : "More details"}
                            aria-label={isExpanded ? "Hide details" : "More details"}
                          >
                            <ChevronDown size={15} className="toggle-arrow" />
                          </button>
                        )}
                      </td>
                    </tr>
                    {isMaterialCat && isExpanded && (
                      <tr className="ledger-material-drawer-row">
                        <td colSpan={8}>
                          <div className="simple-materials-list-wrap">
                            <span className="simple-materials-heading">Materials used:</span>
                            <div className="simple-materials-items">
                              {phaseMaterials.map((mat) => (
                                <div key={mat.id} className="simple-material-row">
                                  <span className="mat-dot" />
                                  <span className="mat-name">{mat.name}</span>
                                  <span className="mat-qty">· {mat.consumedQty} / {mat.quantity} ({mat.percentConsumed}%)</span>
                                  <span className={`mat-status-tag ${mat.status.includes("In Use") ? "in-use" : "staged"}`}>
                                    {mat.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3}>Subtotal ({filtered.length} items)</td>
                <td className="num">${totalEst}M</td>
                <td className="num">${totalAct}M</td>
                <td className={`num ${totalVar < 0 ? "negative" : "positive"}`}>
                  {totalVar >= 0 ? "+" : ""}${Math.abs(totalVar).toFixed(1)}M
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

export function CostOutlook({ project }) {
  const costs = getProjectPhaseCosts(project);
  const actual = costs.reduce((sum, phase) => sum + (phase.actual || 0), 0);
  const remaining = Math.max(0, (project.budget || 0) - actual);
  const committed = remaining * 0.7;
  const forecast = Math.max(project.budget || 0, actual) + (project.budget || 0) * 0.04;
  const pending = (project.budget || 0) * 0.015;
  return (
    <section className="control-section">
      <div className="section-head">
        <h2>Cost outlook</h2>
        <span>Mock forecast · USD</span>
      </div>
      <div className="control-costs">
        {[
          ["Approved budget", project.budget],
          ["Actual spent", actual],
          ["Outstanding commitments", committed],
          ["Forecast final cost", forecast],
          ["Forecast overrun", forecast - project.budget],
          ["Pending changes", pending],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{usdMillions(value)}</strong>
          </div>
        ))}
      </div>
      <p className="control-note">
        Commitments are unpaid orders. Pending changes are excluded from the final-cost forecast.
      </p>
      <Source
        project={project}
        title="Monthly cost forecast and change register"
        sender="Cost controller"
        body={`Actual spend reconciles to the phase ledger. Outstanding orders: ${usdMillions(committed)}. Forecast includes remaining work and ${usdMillions(forecast - project.budget)} overrun; ${usdMillions(pending)} in unapproved changes is tracked separately.`}
      />
    </section>
  );
}

export function CostAnalysisPage({
  project,
  initialPhase = "Construction",
  isEmbedded = false,
  showOutlook = isEmbedded,
  onBack,
}) {
  const [selectedPhase, setSelectedPhase] = useState(initialPhase);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    if (initialPhase) {
      setSelectedPhase(initialPhase);
    }
  }, [initialPhase]);

  const costs = getProjectPhaseCosts(project);
  const currentCost = costs.find((c) => c.phase === selectedPhase) || {
    estimate: 0,
    actual: 0,
  };
  const variance = Math.round((currentCost.estimate - currentCost.actual) * 10) / 10;
  const isActual = currentCost.actual > 0;
  const totalAmount = isActual ? currentCost.actual : currentCost.estimate;

  const expenditures = getPhaseExpenditures(project, selectedPhase);
  const categoryBreakdown = getPhaseCategoryBreakdown(expenditures);

  const Container = isEmbedded ? "div" : "main";

  return (
    <Container className={`page phase-cost-analysis-page ${isEmbedded ? "is-embedded" : ""}`}>
      {!isEmbedded && onBack && (
        <button type="button" className="back" onClick={onBack}>
          <ArrowLeft size={17} /> Back to {project.name}
        </button>
      )}

      <div className="phase-cost-hero">
        <div className="hero-titles">
          {!isEmbedded && (
            <div className="title-line">
              <span>{project.id}</span>
              <Tag type="warm-gray" size="sm">
                Current Project Phase: {project.phase}
              </Tag>
            </div>
          )}
          {isEmbedded ? (
            <h2>Phase Cost & Expenditure Analysis</h2>
          ) : (
            <h1>{project.name} · Phase Cost & Expenditure Analysis</h1>
          )}
          <p>
            Interactive cross-phase comparative expenditure graph, category distribution (materials, salaries & labor, equipment & plant, subcontractors, permits & fees), and itemized expense ledger.
          </p>
        </div>
      </div>

      <section className="phase-cost-kpis">
        <div className="phase-cost-kpi-card">
          <span>Active Inspected Phase</span>
          <strong style={{ color: "var(--accent)" }}>{selectedPhase}</strong>
        </div>
        <div className="phase-cost-kpi-card">
          <span>Phase Estimate</span>
          <strong>${currentCost.estimate}M</strong>
        </div>
        <div className="phase-cost-kpi-card">
          <span>Actual Incurred</span>
          <strong>${currentCost.actual}M</strong>
        </div>
        <div className="phase-cost-kpi-card">
          <span>Variance</span>
          <strong className={variance < 0 ? "negative" : "positive"}>
            {variance >= 0 ? "+" : ""}${Math.abs(variance).toFixed(1)}M
          </strong>
        </div>
      </section>

      {/* 1. Graph with different phases */}
      <PhaseCostGraph
        project={project}
        selectedPhase={selectedPhase}
        onSelectPhase={(phase) => {
          setSelectedPhase(phase);
          setSelectedCategory("All");
        }}
      />

      {/* 2. Donut / Pie Chart & 3. List of Expenses */}
      <div className="phase-analytics-grid">
        <PhasePieChart
          breakdown={categoryBreakdown}
          totalAmount={totalAmount}
          isActual={isActual}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <PhaseExpenseLedger
          project={project}
          expenditures={expenditures}
          selectedPhase={selectedPhase}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>
    </Container>
  );
}

export default CostAnalysisPage;

