import React, { useState, useEffect } from "react";
import {
  FileQuestion,
  FileText,
  FileCheck,
  Search,
  Eye,
  Plus,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Printer,
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import "./TechnicalQueriesSection.css";

// Initial Authentic Technical Queries with PDF sources
const DEFAULT_QUERIES = [
  {
    id: "TQ-PRJ-2401-001",
    title: "Pipe wall thickness discrepancy vs ASME B31.3 Section 304",
    asset: "Cooling water & hydrocarbon spool CW-014",
    discipline: "Piping & Materials",
    status: "Under review",
    date: "2026-09-11",
    author: "Senior Piping Engineer (M. Chen)",
    query:
      "During ultrasonic thickness testing of receiving spool CW-014, measured wall thickness was 9.12mm against nominal schedule 80 spec (9.53mm). Requesting confirmation whether 9.12mm complies with minimum mill tolerance (-12.5%) under ASME B31.3 or if derating/replacement is required.",
    disposition:
      "Calculation check by Stress Engineering confirms min required thickness is 7.84mm under 45.0 barg design pressure. Material acceptable under ASME B31.3 mill tolerance clause 304.1.2. Engineering disposition approved pending QA punch closeout.",
    pdf: {
      filename: "ASME-B31.3-Piping-Spec-CW014-RevC.pdf",
      docNumber: "DOC-ENG-PIP-2026-041",
      revision: "Rev C",
      date: "2026-09-02",
      page: "Page 14, Clause 4.2",
      totalSize: "2.4 MB",
      totalPages: 18,
      currentPage: 14,
      stamp: "APPROVED FOR CONSTRUCTION",
      documentTitle: "PIPING MATERIAL SPECIFICATION & PRESSURE DESIGN CRITERIA",
      client: "National Energy & Infrastructure Authority",
      contractor: "Apex Engineering & EPC Consortium",
      discipline: "PIPING & MECHANICAL ENGINEERING",
      section: "SECTION 4.0 · INTERNAL PRESSURE DESIGN & WALL THICKNESS CRITERIA",
      bodyClauses: [
        "4.1 Scope: This technical specification defines the mechanical design, allowable stress criteria, and corrosion allowance for high-pressure hydrocarbon and cooling water service pipelines operating within the facility boundary.",
        "4.2 Pressure Design Formulation: Straight pipe wall thickness calculations shall adhere strictly to ASME B31.3 Process Piping Code equations for internal pressure containment.",
      ],
      calloutExcerpt:
        "Clause 304.1.2 Minimum Required Wall Thickness: tm = t + c. For internal pressure design, the minimum pipe wall thickness calculated shall not exceed allowable stress S * E. Spool CW-014 allowable minimum is 7.84 mm at 45.0 barg design condition.",
      calloutClauseId: "Clause 304.1.2",
      specTable: [
        { param: "Nominal Size & Schedule", value: "8-Inch NPS / Schedule 80" },
        { param: "Design Pressure (P)", value: "45.0 barg (652.6 psig)" },
        { param: "Design Temperature (T)", value: "120 °C (248 °F)" },
        { param: "Allowable Stress (S)", value: "138.0 MPa (ASTM A106 Gr. B)" },
        { param: "Joint Efficiency (E)", value: "1.00 (Seamless)" },
        { param: "Corrosion Allowance (c)", value: "3.00 mm" },
        { param: "Calculated Min. Thickness (tm)", value: "7.84 mm (Permissible)" },
      ],
      leadSignoff: "M. Chen, PE - Lead Piping Engineer",
      chiefSignoff: "D. Sterling, CEng - Chief Technical Authority",
      qaSignoff: "J. Vane - QA/QC Inspection Director",
    },
  },
  {
    id: "TQ-PRJ-2401-002",
    title: "High-Pressure Flange Gasket Material Deviation for Sour Service",
    asset: "High-Pressure Flare Header Section 2 (FL-102)",
    discipline: "Process Safety & Piping",
    status: "Approved / Closed",
    date: "2026-09-07",
    author: "Materials & Corrosion Lead (K. Larson)",
    query:
      "Vendor supplied Spiral Wound 316L/Graphite gaskets instead of specified Inconel 625 inner ring gaskets for sour gas service (>500 ppm H2S). Can 316L with PTFE/Graphite filler be approved for non-cyclic flare lines below 120°C?",
    disposition:
      "Rejected for main flare line. Inconel 625 inner ring is strictly mandated by Project NACE MR0175 / ISO 15156 compliance matrix. Vendor dispatched Inconel 625 replacement gaskets under quarantine replacement NCR-008.",
    pdf: {
      filename: "NACE-MR0175-Sour-Service-Piping-Spec-RevD.pdf",
      docNumber: "SPEC-MAT-H2S-2026-018",
      revision: "Rev D",
      date: "2026-08-25",
      page: "Page 28, Section 6.4",
      totalSize: "3.8 MB",
      totalPages: 34,
      currentPage: 28,
      stamp: "APPROVED FOR CONSTRUCTION",
      documentTitle: "MATERIALS SELECTION SPECIFICATION FOR SOUR SERVICE (H2S)",
      client: "National Energy & Infrastructure Authority",
      contractor: "Apex Engineering & EPC Consortium",
      discipline: "MATERIALS & METALLURGY",
      section: "SECTION 6.0 · FLANGE FACINGS, GASKETS & FASTENERS IN SOUR ENVIRONMENTS",
      bodyClauses: [
        "6.1 Scope: Mandatory metallurgical and sealing requirements for piping, valves, and pressurized vessels handling fluids containing hydrogen sulfide (H2S) with partial pressure exceeding 0.05 psia.",
        "6.2 Material Hardness Limits: All metallic components shall be heat-treated to satisfy NACE MR0175 maximum hardness limits (22 HRC maximum for carbon steels).",
      ],
      calloutExcerpt:
        "Section 6.4.1 Gasket Selection for Sour Gas Facilities: All Class 600# and above flanges conveying sour hydrocarbon gas (>50 ppm H2S) must utilize ASME B16.20 Spiral Wound Gaskets with Alloy 625 (UNS N06625) inner rings to prevent stress corrosion cracking.",
      calloutClauseId: "Section 6.4.1",
      specTable: [
        { param: "Service Category", value: "Sour Gas / Wet Hydrocarbon" },
        { param: "H2S Concentration", value: "520 ppm mol (Partial Pressure 0.28 bar)" },
        { param: "Mandatory Gasket Type", value: "ASME B16.20 Spiral Wound" },
        { param: "Inner Ring Metallurgy", value: "Inconel 625 (UNS N06625)" },
        { param: "Winding Metallurgy", value: "Alloy 625 / Flexible Graphite" },
        { param: "Prohibited Materials", value: "Austenitic 316L in stressed inner ring" },
      ],
      leadSignoff: "K. Larson, PhD - Materials Integrity Specialist",
      chiefSignoff: "D. Sterling, CEng - Chief Technical Authority",
      qaSignoff: "T. Holtz - NDT & Welding Verification Lead",
    },
  },
  {
    id: "TQ-PRJ-2401-003",
    title: "Subsea Control Accumulator Sizing Verification per API 16D",
    asset: "Subsea BOP Hydraulic Control Pod (BOP-ACC-002)",
    discipline: "Subsea & Drilling",
    status: "Open",
    date: "2026-09-12",
    author: "Subsea Controls Specialist (R. Vance)",
    query:
      "BOP manufacturer documentation indicates usable hydraulic volume of 185 liters at 3,000 psi precharge, but API 16D Section 5.3 requires 1.5x functional safety factor after shear ram closure. Clarify if surface accumulator rack is counted toward the closing volume.",
    disposition:
      "Awaiting formal response from original equipment manufacturer. Subsea engineering team currently reviewing fast-dump valve circuit simulation and acoustic backup trigger latency.",
    pdf: {
      filename: "API-16D-Control-System-Datasheet-RevB.pdf",
      docNumber: "DS-BOP-CTL-16D-009",
      revision: "Rev B",
      date: "2026-09-05",
      page: "Page 7, Table 3.1",
      totalSize: "1.9 MB",
      totalPages: 12,
      currentPage: 7,
      stamp: "ENGINEERING REVIEW DRAFT",
      documentTitle: "CONTROL SYSTEMS FOR DRILLING WELL CONTROL EQUIPMENT",
      client: "National Energy & Infrastructure Authority",
      contractor: "Offshore Deepwater Drilling Systems",
      discipline: "SUBSEA & DRILLING CONTROLS",
      section: "SECTION 5.0 · ACCUMULATOR VOLUMETRIC CAPACITY & SIZING REQUIREMENTS",
      bodyClauses: [
        "5.1 General Requirements: The subsea hydraulic accumulator system shall provide dedicated pressure fluid to actuate all fail-safe emergency disconnect functions independently of the surface umbilical link.",
        "5.2 Precharge Verification: Nitrogen precharge pressures shall be compensated for seabed hydrostatic temperature (4°C) and water depth (1,850 meters).",
      ],
      calloutExcerpt:
        "Section 5.3.2 Accumulator Volumetric Capacity: The hydraulic control system shall have a minimum dedicated liquid capacity with pumps stopped to operate the annular blowout preventer, close all pipe rams, and close the shear ram with remaining pressure at least 200 psi above precharge.",
      calloutClauseId: "Section 5.3.2",
      specTable: [
        { param: "Total Bottle Rack Volume", value: "320 Liters (8 x 40L Bottles)" },
        { param: "Nitrogen Precharge Pressure", value: "3,000 psig at 20°C" },
        { param: "Seabed Operating Temperature", value: "4.0 °C (Hydrostatic adjusted)" },
        { param: "Minimum Shear Ram Requirement", value: "142 Liters at 1,500 psi differential" },
        { param: "Safety Multiplier Required", value: "1.50x API 16D Functional Factor" },
        { param: "Current Usable Delivery", value: "185 Liters (Margin: +30% vs +50% target)" },
      ],
      leadSignoff: "R. Vance - Senior Subsea Controls Lead",
      chiefSignoff: "E. Thorne, PE - Drilling Engineering Director",
      qaSignoff: "W. Kowalski - Subsea Systems Commissioning Lead",
    },
  },
  {
    id: "TQ-PRJ-2401-004",
    title: "CompEx Zone 1 Hazardous Area Instrument Junction Box Ingress Rating",
    asset: "Gas Turbine Compressor Skid JB-402",
    discipline: "Electrical & Instrumentation",
    status: "Under review",
    date: "2026-09-09",
    author: "Lead Instrumentation Engineer (D. Al-Mansoor)",
    query:
      "Field installation team noted that supplied junction box JB-402 is certified Ex d IIB T4 with IP65 gland entries, whereas the hazardous area schedule specifies IP66 for tropical offshore monsoon exposure. Confirm if silicone sealant thread barrier is permissible or if IP66 breather drains are needed.",
    disposition:
      "Engineering disposition recommends fitting certified Ex d IP66 Breather Drain Plugs (CMP or Hawke approved) to prevent moisture condensation. Supplier certificate review underway.",
    pdf: {
      filename: "IECEx-Hazardous-Area-Classification-JB402.pdf",
      docNumber: "CERT-IECEx-BASEEFA-2026-772",
      revision: "Rev 2",
      date: "2026-08-30",
      page: "Page 3, Certificate Clause 7",
      totalSize: "1.5 MB",
      totalPages: 8,
      currentPage: 3,
      stamp: "VERIFIED CERTIFIED EQUIPMENT",
      documentTitle: "IECEx CERTIFICATE OF CONFORMITY · EXPLOSION PROTECTED ENCLOSURES",
      client: "National Energy & Infrastructure Authority",
      contractor: "Apex Electrical EPC Team",
      discipline: "ELECTRICAL & INSTRUMENTATION",
      section: "CLAUSE 7.0 · ENVIRONMENTAL INGRESS & SPECIAL CONDITIONS OF CERTIFIED SAFE USE",
      bodyClauses: [
        "7.1 Flameproof Testing: Type-tested to IEC 60079-0 and IEC 60079-1 for gas groups IIA and IIB in explosive atmospheres, ambient temperature range -20°C to +55°C.",
        "7.2 Cable Entry Threads: Metric ISO M20/M25 entries provided with 5 full threads engagement.",
      ],
      calloutExcerpt:
        "Clause 7.2 Degree of Ingress Protection: The flameproof enclosure meets IP65 without external sealing. For installation in offshore or high-humidity tropical marine zones, an auxiliary IP66 breather drain certified to IEC 60079-0 and IEC 60079-1 shall be installed at the lowest point of the enclosure.",
      calloutClauseId: "Clause 7.2",
      specTable: [
        { param: "Enclosure Type", value: "Ex d Flameproof Cast Aluminum" },
        { param: "Area Classification", value: "Zone 1, Gas Group IIB, T4" },
        { param: "Standard Ingress Rating", value: "IP65 (Dust-tight, Water jets)" },
        { param: "Mandatory Offshore Requirement", value: "IP66 (Heavy seas, Monsoon washdown)" },
        { param: "Approved Mitigation", value: "Ex d IP66 Breather Drain Plug CMP-DP-E" },
      ],
      leadSignoff: "D. Al-Mansoor, CompEx #8492 - Principal Electrical Lead",
      chiefSignoff: "D. Sterling, CEng - Chief Technical Authority",
      qaSignoff: "F. Rossi - Hazardous Area Compliance Inspector",
    },
  },
  {
    id: "TQ-PRJ-2401-005",
    title: "Cryogenic Cold Box Foundation Tie-In Anchor Bolt Tensioning Spec",
    asset: "LNG Train 2 Liquefaction Cold Box MCHE-01",
    discipline: "Civil & Structural",
    status: "Approved / Closed",
    date: "2026-09-01",
    author: "Structural Package Engineer (S. O'Connor)",
    query:
      "Civil contractor requested clarification on whether hydraulic tensioning or calibrated torque wrench is required for M48 Grade 8.8 anchor bolts subjected to cryogenic thermal contraction down to -162°C.",
    disposition:
      "Hydraulic multi-tool tensioning to 480 kN residual preload is mandatory as per Cryogenic Equipment Foundation Standard. Torque method is not permitted due to unpredictable thread friction in coastal environment.",
    pdf: {
      filename: "LNG-Train2-ColdBox-Foundation-Spec-RevE.pdf",
      docNumber: "STD-STR-LNG-2026-104",
      revision: "Rev E",
      date: "2026-08-18",
      page: "Page 19, Section 8.3",
      totalSize: "4.2 MB",
      totalPages: 42,
      currentPage: 19,
      stamp: "APPROVED FOR CONSTRUCTION",
      documentTitle: "STRUCTURAL SPECIFICATION FOR CRYOGENIC EQUIPMENT FOUNDATIONS",
      client: "National Energy & Infrastructure Authority",
      contractor: "Apex Infrastructure & Civil Engineering",
      discipline: "CIVIL & STRUCTURAL ENGINEERING",
      section: "SECTION 8.0 · FOUNDATION ANCHOR BOLTING & RESIDUAL THERMAL PRELOAD",
      bodyClauses: [
        "8.1 Scope: Specification for embedment plates, shear keys, and heavy anchor bolts securing cryogenic cold boxes, liquefaction heat exchangers, and cryogenic liquid expanders.",
        "8.2 Material Grades: All anchor bolts shall conform to ASTM A320 Grade L7 or ISO 898-1 Class 8.8 with Charpy V-notch impact test at -101°C.",
      ],
      calloutExcerpt:
        "Section 8.3 Anchor Bolt Preload for Thermal Contraction Equipment: All foundation anchor bolts for equipment operating below -40°C shall be preloaded utilizing synchronized hydraulic bolt tensioners to ensure residual bolt tension compensates for thermal shrinkage of the base skirt.",
      calloutClauseId: "Section 8.3",
      specTable: [
        { param: "Bolt Size & Pitch", value: "M48 x 5.0 mm" },
        { param: "Bolt Material Grade", value: "ASTM A320 Grade L7 / Class 8.8" },
        { param: "Equipment Operating Temp", value: "-162 °C (Liquid Natural Gas)" },
        { param: "Mandatory Preload Method", value: "Synchronized Hydraulic Multi-Tensioner" },
        { param: "Specified Target Preload", value: "480 kN ± 5% residual tension" },
        { param: "Prohibited Methods", value: "Manual / Pneumatic Impact Torquing" },
      ],
      leadSignoff: "S. O'Connor, MIStructE - Structural Lead",
      chiefSignoff: "D. Sterling, CEng - Chief Technical Authority",
      qaSignoff: "P. Gomez - Civil Quality Assurance Lead",
    },
  },
];

// Interactive PDF Document Viewer Modal Component
export function PdfViewerModal({ pdfDoc, onClose }) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(pdfDoc?.currentPage || 1);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!pdfDoc) return null;

  const handleZoom = (delta) => {
    setZoomLevel((prev) => Math.max(70, Math.min(150, prev + delta)));
  };

  const handleDownload = () => {
    const blob = new Blob(
      [
        `OFFICIAL PROJECT SPECIFICATION / PDF SOURCE EXPORT\n` +
          `Document: ${pdfDoc.filename}\n` +
          `Number: ${pdfDoc.docNumber} (${pdfDoc.revision})\n` +
          `Title: ${pdfDoc.documentTitle}\n` +
          `Discipline: ${pdfDoc.discipline}\n` +
          `Date: ${pdfDoc.date}\n\n` +
          `HIGHLIGHTED TECHNICAL QUERY REFERENCE:\n${pdfDoc.calloutExcerpt}\n\n` +
          `SPECIFICATION PARAMETERS:\n` +
          pdfDoc.specTable.map((r) => `- ${r.param}: ${r.value}`).join("\n") +
          `\n\nApproved: ${pdfDoc.chiefSignoff}\nVerified Source Document Record.`,
      ],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdfDoc.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pdf-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pdf-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* PDF Top Navigation Bar */}
        <header className="pdf-modal-header">
          <div className="pdf-modal-doc-meta">
            <span className="pdf-badge-tag">PDF</span>
            <div>
              <div className="pdf-header-title">{pdfDoc.filename}</div>
              <div className="pdf-header-sub">
                {pdfDoc.docNumber} · {pdfDoc.revision} · {pdfDoc.totalSize}
              </div>
            </div>
          </div>

          <div className="pdf-toolbar-actions">
            <button
              type="button"
              className="pdf-tool-btn"
              onClick={() => handleZoom(-10)}
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="pdf-page-indicator">{zoomLevel}%</span>
            <button
              type="button"
              className="pdf-tool-btn"
              onClick={() => handleZoom(10)}
              title="Zoom In"
              aria-label="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <span className="pdf-page-indicator">
              Page {currentPage} of {pdfDoc.totalPages}
            </span>

            <button
              type="button"
              className="pdf-tool-btn"
              onClick={handleDownload}
              title="Download Document"
            >
              <Download size={14} /> <span>Download</span>
            </button>

            <button
              type="button"
              className="pdf-close-btn"
              onClick={onClose}
              title="Close PDF Viewer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* PDF Document Paper Viewport */}
        <div className="pdf-viewport-area">
          <article
            className="pdf-sheet"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.1s ease",
            }}
          >
            {/* Title Block Header */}
            <div className="pdf-sheet-header">
              <div className="pdf-title-block-main">
                <h1>{pdfDoc.documentTitle}</h1>
                <p>
                  Client: {pdfDoc.client} · EPC Contractor: {pdfDoc.contractor}
                </p>
                <div className="pdf-stamp-watermark">
                  <ShieldCheck size={13} /> {pdfDoc.stamp}
                </div>
              </div>
              <div className="pdf-title-block-meta">
                <div>
                  <strong>DOC NO:</strong> {pdfDoc.docNumber}
                </div>
                <div>
                  <strong>REVISION:</strong> {pdfDoc.revision}
                </div>
                <div>
                  <strong>DATE:</strong> {pdfDoc.date}
                </div>
                <div>
                  <strong>DISCIPLINE:</strong> {pdfDoc.discipline}
                </div>
                <div>
                  <strong>PAGE:</strong> {currentPage} of {pdfDoc.totalPages}
                </div>
              </div>
            </div>

            {/* Document Body */}
            <div className="pdf-sheet-body">
              <h2 className="pdf-section-title">{pdfDoc.section}</h2>

              {pdfDoc.bodyClauses.map((clause, idx) => (
                <p key={idx} style={{ margin: 0 }}>
                  {clause}
                </p>
              ))}

              {/* Verified Highlight Callout Referenced in Query */}
              <div className="pdf-highlight-callout">
                <div className="pdf-callout-tag">
                  <FileCheck size={13} /> Cited in Technical Query Source ({pdfDoc.calloutClauseId})
                </div>
                <p className="pdf-callout-text">{pdfDoc.calloutExcerpt}</p>
                <div className="pdf-callout-ref">
                  Source Reference: {pdfDoc.filename} ({pdfDoc.page})
                </div>
              </div>

              {/* Spec Table */}
              {pdfDoc.specTable && (
                <div>
                  <h3
                    style={{
                      fontSize: "12px",
                      textTransform: "uppercase",
                      margin: "10px 0 6px 0",
                      color: "#333",
                    }}
                  >
                    Engineering Criteria &amp; Governing Thresholds
                  </h3>
                  <table className="pdf-spec-table">
                    <thead>
                      <tr>
                        <th>Design Parameter / Standard Attribute</th>
                        <th>Specified Requirement / Engineering Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pdfDoc.specTable.map((row, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{row.param}</strong>
                          </td>
                          <td>{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Engineering Sign-off Block */}
            <div className="pdf-signoff-block">
              <div className="pdf-sign-box">
                <span className="pdf-sign-role">Prepared &amp; Verified</span>
                <span className="pdf-sign-name">{pdfDoc.leadSignoff}</span>
                <span className="pdf-sign-date">Digital Signed: {pdfDoc.date}</span>
              </div>
              <div className="pdf-sign-box">
                <span className="pdf-sign-role">Discipline Approval</span>
                <span className="pdf-sign-name">{pdfDoc.chiefSignoff}</span>
                <span className="pdf-sign-date">Approved for Issue</span>
              </div>
              <div className="pdf-sign-box">
                <span className="pdf-sign-role">Quality &amp; Compliance</span>
                <span className="pdf-sign-name">{pdfDoc.qaSignoff}</span>
                <span className="pdf-sign-date">Conformance Stamped</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

// Main Technical Queries Component
export default function TechnicalQueriesSection({ project }) {
  const [queries, setQueries] = useState(DEFAULT_QUERIES);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [disciplineFilter, setDisciplineFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);

  // New query draft state
  const [newDraft, setNewDraft] = useState({
    title: "",
    asset: "",
    discipline: "Piping & Materials",
    author: "Project Engineer",
    query: "",
    disposition: "Pending initial technical assessment by discipline lead.",
    pdfName: "Standard-Engineering-Spec-2026.pdf",
    docNumber: "SPEC-ENG-2026-099",
    page: "Page 1, Clause 1.1",
    excerpt: "Specification clause under technical review by the engineering team.",
  });

  const disciplines = [
    "All",
    "Piping & Materials",
    "Process Safety & Piping",
    "Subsea & Drilling",
    "Electrical & Instrumentation",
    "Civil & Structural",
  ];

  const statuses = ["All", "Open", "Under review", "Approved / Closed"];

  const filteredQueries = queries.filter((q) => {
    const matchesStatus = statusFilter === "All" || q.status === statusFilter;
    const matchesDiscipline = disciplineFilter === "All" || q.discipline === disciplineFilter;
    const term = searchQuery.toLowerCase().trim();
    const matchesSearch =
      term === "" ||
      q.id.toLowerCase().includes(term) ||
      q.title.toLowerCase().includes(term) ||
      q.asset.toLowerCase().includes(term) ||
      q.discipline.toLowerCase().includes(term) ||
      q.pdf.filename.toLowerCase().includes(term);

    return matchesStatus && matchesDiscipline && matchesSearch;
  });

  const totalQueries = queries.length;
  const openCount = queries.filter((q) => q.status === "Open").length;
  const reviewCount = queries.filter((q) => q.status === "Under review").length;
  const closedCount = queries.filter((q) => q.status === "Approved / Closed").length;

  const handleCreateQuery = (e) => {
    e.preventDefault();
    if (!newDraft.title.trim() || !newDraft.query.trim()) return;

    const newQueryItem = {
      id: `TQ-PRJ-2401-${String(queries.length + 1).padStart(3, "0")}`,
      title: newDraft.title,
      asset: newDraft.asset || "Project General Asset",
      discipline: newDraft.discipline,
      status: "Open",
      date: new Date().toISOString().slice(0, 10),
      author: newDraft.author,
      query: newDraft.query,
      disposition: newDraft.disposition,
      pdf: {
        filename: newDraft.pdfName || "General-Specification.pdf",
        docNumber: newDraft.docNumber || "DOC-2026-REF",
        revision: "Rev A",
        date: new Date().toISOString().slice(0, 10),
        page: newDraft.page || "Page 1",
        totalSize: "1.8 MB",
        totalPages: 10,
        currentPage: 1,
        stamp: "ISSUED FOR TECHNICAL QUERY",
        documentTitle: `PROJECT SPECIFICATION · ${newDraft.title.toUpperCase()}`,
        client: "National Energy Authority",
        contractor: "Apex EPC Consortium",
        discipline: newDraft.discipline.toUpperCase(),
        section: "SECTION 1.0 · GOVERNING REQUIREMENTS & SCOPE",
        bodyClauses: [
          "1.1 General Specification: This document outlines verified engineering requirements and criteria applicable to this technical query.",
        ],
        calloutExcerpt: newDraft.excerpt || "Governing requirement under technical evaluation.",
        calloutClauseId: "Clause 1.1",
        specTable: [
          { param: "Target Asset", value: newDraft.asset || "General" },
          { param: "Responsible Lead", value: newDraft.author },
          { param: "Status", value: "Open - Technical Query Raised" },
        ],
        leadSignoff: `${newDraft.author} - Raising Engineer`,
        chiefSignoff: "D. Sterling, CEng - Chief Technical Authority",
        qaSignoff: "Quality Audit Register",
      },
    };

    setQueries([newQueryItem, ...queries]);
    setShowNewModal(false);
    setNewDraft({
      title: "",
      asset: "",
      discipline: "Piping & Materials",
      author: "Project Engineer",
      query: "",
      disposition: "Pending initial technical assessment by discipline lead.",
      pdfName: "Standard-Engineering-Spec-2026.pdf",
      docNumber: "SPEC-ENG-2026-099",
      page: "Page 1, Clause 1.1",
      excerpt: "Specification clause under technical review by the engineering team.",
    });
  };

  return (
    <section className="panel technical-queries-panel" aria-label="Technical queries register">
      {/* Header */}
      <div className="section-head tq-head">
        <div>
          <div className="tq-title-row">
            <h2>Technical queries &amp; document references</h2>
            <span className="tq-id-badge">{project?.id || "PRJ-2401"}</span>
          </div>
          <p>
            Official engineering queries, formal vendor clarifications, and governing PDF specification sources.
          </p>
        </div>
        <div className="tq-actions">
          <button
            type="button"
            className="btn-new-tq"
            onClick={() => setShowNewModal(true)}
          >
            <Plus size={15} /> Raise technical query
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="tq-kpi-grid">
        <div className="tq-kpi-card">
          <span>Total Queries</span>
          <strong>{totalQueries}</strong>
        </div>
        <div className="tq-kpi-card highlight">
          <span>Open Queries</span>
          <strong>{openCount}</strong>
        </div>
        <div className="tq-kpi-card">
          <span>Under Review</span>
          <strong>{reviewCount}</strong>
        </div>
        <div className="tq-kpi-card">
          <span>Approved / Closed</span>
          <strong>{closedCount}</strong>
        </div>
        <div className="tq-kpi-card">
          <span>Linked PDF Sources</span>
          <strong>{totalQueries}</strong>
        </div>
      </div>

      {/* Toolbar: Search and Status / Discipline Filters */}
      <div className="tq-toolbar">
        <div className="tq-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search queries, equipment, tags, or PDF document names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search technical queries"
          />
        </div>

        <div className="tq-filter-pills" role="tablist" aria-label="Filter by query status">
          {statuses.map((st) => (
            <button
              key={st}
              type="button"
              className={`tq-pill ${statusFilter === st ? "active" : ""}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === "All" ? "All statuses" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Query List */}
      <div className="tq-list">
        {filteredQueries.length === 0 ? (
          <div className="empty-skills-msg">
            No technical queries match the selected filters or search terms.
          </div>
        ) : (
          filteredQueries.map((q) => (
            <article className="tq-card" key={q.id}>
              {/* Card Header */}
              <div className="tq-card-header">
                <div>
                  <div className="tq-meta-badges">
                    <span className="tq-id-badge">{q.id}</span>
                    <span className="tq-discipline-badge">{q.discipline}</span>
                  </div>
                  <h3 className="tq-title">{q.title}</h3>
                  <div className="tq-meta-info">
                    <span>
                      <Clock size={13} /> {q.date}
                    </span>
                    <span>
                      <strong>Raised by:</strong> {q.author}
                    </span>
                    <span className="tq-asset-tag">
                      <strong>Asset:</strong> {q.asset}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "12px",
                    background:
                      q.status === "Approved / Closed"
                        ? "rgba(46, 125, 50, 0.2)"
                        : q.status === "Open"
                          ? "rgba(229, 90, 42, 0.2)"
                          : "rgba(33, 150, 243, 0.2)",
                    color:
                      q.status === "Approved / Closed"
                        ? "#4caf50"
                        : q.status === "Open"
                          ? "#ff9800"
                          : "#29b6f6",
                    border:
                      q.status === "Approved / Closed"
                        ? "1px solid rgba(76, 175, 80, 0.3)"
                        : q.status === "Open"
                          ? "1px solid rgba(255, 152, 0, 0.3)"
                          : "1px solid rgba(41, 182, 246, 0.3)",
                  }}
                >
                  {q.status}
                </span>
              </div>

              {/* Query Content & Engineering Disposition */}
              <div className="tq-content-box">
                <p className="tq-query-text">
                  <strong>Query:</strong> {q.query}
                </p>
                <div className="tq-disposition">
                  <div className="tq-disposition-head">Technical Disposition &amp; Resolution</div>
                  <p>{q.disposition}</p>
                </div>
              </div>

              {/* PDF Document Source Box */}
              <div className="tq-pdf-source-box">
                <div className="tq-pdf-info">
                  <div className="tq-pdf-icon-wrap" aria-hidden="true">
                    <FileText size={20} />
                  </div>
                  <div className="tq-pdf-details">
                    <div className="tq-pdf-filename">{q.pdf.filename}</div>
                    <div className="tq-pdf-citation">
                      <strong>Document Ref:</strong> {q.pdf.docNumber} ({q.pdf.revision}) · {q.pdf.page}
                    </div>
                    <div className="tq-pdf-quote">"{q.pdf.calloutExcerpt}"</div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-view-pdf"
                  onClick={() => setSelectedPdf(q.pdf)}
                  title={`Open ${q.pdf.filename}`}
                >
                  <Eye size={14} /> View Source PDF
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* PDF Document Viewer Modal */}
      {selectedPdf && (
        <PdfViewerModal pdfDoc={selectedPdf} onClose={() => setSelectedPdf(null)} />
      )}

      {/* Raise New Technical Query Modal */}
      {showNewModal && (
        <div className="tq-form-overlay" onClick={() => setShowNewModal(false)}>
          <div className="tq-form-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Raise New Technical Query</h2>
            <form onSubmit={handleCreateQuery} className="tq-form-grid">
              <label>
                Query Title / Subject *
                <input
                  required
                  type="text"
                  placeholder="e.g. Flange bolt torquing specification clarification"
                  value={newDraft.title}
                  onChange={(e) => setNewDraft({ ...newDraft, title: e.target.value })}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Engineering Discipline
                  <select
                    value={newDraft.discipline}
                    onChange={(e) => setNewDraft({ ...newDraft, discipline: e.target.value })}
                  >
                    {disciplines
                      .filter((d) => d !== "All")
                      .map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  Equipment Tag / Line / Asset
                  <input
                    type="text"
                    placeholder="e.g. Line 14-P-0201 or Skid MCHE-01"
                    value={newDraft.asset}
                    onChange={(e) => setNewDraft({ ...newDraft, asset: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Query &amp; Technical Question *
                <textarea
                  required
                  rows={3}
                  placeholder="Detail the technical observation, conflict between drawings/specifications, or calculation query..."
                  value={newDraft.query}
                  onChange={(e) => setNewDraft({ ...newDraft, query: e.target.value })}
                />
              </label>

              <div style={{ borderTop: "1px solid #333a40", paddingTop: "12px" }}>
                <strong style={{ fontSize: "12px", color: "#ff8a80", display: "block", marginBottom: "8px" }}>
                  Governing PDF Document Source Reference
                </strong>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "12px" }}>
                  <label>
                    PDF Document File Name
                    <input
                      type="text"
                      placeholder="e.g. ASME-B31.3-Piping-Spec-RevC.pdf"
                      value={newDraft.pdfName}
                      onChange={(e) => setNewDraft({ ...newDraft, pdfName: e.target.value })}
                    />
                  </label>
                  <label>
                    Doc Number &amp; Revision
                    <input
                      type="text"
                      placeholder="e.g. SPEC-PIP-2026-041 (Rev C)"
                      value={newDraft.docNumber}
                      onChange={(e) => setNewDraft({ ...newDraft, docNumber: e.target.value })}
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px", marginTop: "8px" }}>
                  <label>
                    Page &amp; Clause
                    <input
                      type="text"
                      placeholder="e.g. Page 14, Clause 4.2"
                      value={newDraft.page}
                      onChange={(e) => setNewDraft({ ...newDraft, page: e.target.value })}
                    />
                  </label>
                  <label>
                    Cited Clause Excerpt
                    <input
                      type="text"
                      placeholder="Quoted clause or governing sentence from the PDF..."
                      value={newDraft.excerpt}
                      onChange={(e) => setNewDraft({ ...newDraft, excerpt: e.target.value })}
                    />
                  </label>
                </div>
              </div>

              <div className="tq-form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowNewModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Save &amp; Link Query
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
