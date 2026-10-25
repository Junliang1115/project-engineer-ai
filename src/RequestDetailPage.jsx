import React, { useEffect, useState } from "react";
import {
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Info,
  Maximize2,
  Pencil,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import { documentFileUrl } from "./api.js";
import BackButton from "./components/BackButton.jsx";
import "./RequestDetail.css";

// Request detail, "reasoning-first" layout (design option 1c): the original document on the
// left; on the right the agent explains its read of the request, lays out its plan ending in
// the reply, and the reply is edited in a dialog.

// ── Agent config ──────────────────────────────────────────────────────────────
const AGENTS = [
  {
    key: "risk",
    label: "Risk Agent",
    description: "Schedule, cost, and safety risk exposure.",
  },
  {
    key: "compliance",
    label: "Compliance Agent",
    description: "Regulatory, HSE, and contractual compliance.",
  },
  {
    key: "technical",
    label: "Technical Agent",
    description: "Engineering and technical disposition.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function confidenceLevel(conf) {
  if (conf == null) return "low";
  if (conf >= 80) return "high";
  if (conf >= 60) return "medium";
  return "low";
}

/** First sentence of the summary is the headline; the rest is the supporting detail. */
function splitSummary(summary) {
  const [headline, ...rest] = String(summary || "")
    .trim()
    .split(/(?<=[.!?])\s+/);
  return { headline, detail: rest.join(" ") };
}

/** One line under the plan: flags raised across agents, or none. */
function flagSummary(agentResponses) {
  if (!AGENTS.some((a) => agentResponses?.[a.key]?.content))
    return "Agent analysing...";
  const flags = AGENTS.flatMap((a) => agentResponses?.[a.key]?.flags || []);
  if (flags.length === 0) return "No risk flags raised by the agents";
  return `${flags.length} flag${flags.length > 1 ? "s" : ""} raised: ${flags
    .map((f) => f.label)
    .join(" · ")}`;
}

// ── Left: original document ───────────────────────────────────────────────────
// The PDF comes from the document table: the stored attachment of the email that raised the
// request (request.documentId), served by GET /documents/{id}/file.
function DocumentPanel({ request, isTQ }) {
  const fileUrl = request.documentId
    ? documentFileUrl(request.documentId)
    : request.attachmentUrl;
  const hasAttachment = Boolean(fileUrl);
  const filename = request.attachmentName || `${request.id}_document.pdf`;
  const pages = request.attachmentPages
    ? `${request.attachmentPages} page${request.attachmentPages === 1 ? "" : "s"}`
    : "";
  const meta = [
    request.submittedBy,
    pages,
    request.attachmentSize,
    request.submittedDate,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="rdp-doc" aria-label="Request document">
      <div className="rdp-doc-kicker">
        <FileText size={13} aria-hidden="true" />
        Original document
        {hasAttachment && (
          <span className="rdp-doc-links">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="rdp-doc-download"
              aria-label="Open the PDF in a new tab"
            >
              <Maximize2 size={13} aria-hidden="true" />
              Open
            </a>
            <a
              href={fileUrl}
              download={filename}
              className="rdp-doc-download"
              aria-label="Download attachment"
            >
              <Download size={13} aria-hidden="true" />
              Download
            </a>
          </span>
        )}
      </div>
      <h2 className="rdp-doc-title">{filename}</h2>
      {meta && <p className="rdp-doc-meta">{meta}</p>}

      <div className="rdp-doc-body">
        {hasAttachment ? (
          <>
            {/* Open each page at the panel's width (Chrome/Edge: view=FitH, Firefox: zoom=page-width). */}
            <iframe
              src={`${fileUrl}#view=FitH&zoom=page-width&navpanes=0`}
              className="rdp-doc-frame"
              title={`Attachment for ${request.id}`}
            />
            {/* Phones can't show a PDF inside a page; offer the browser's own viewer instead. */}
            <a className="rdp-doc-mobile" href={fileUrl} target="_blank" rel="noreferrer">
              <FileText size={28} aria-hidden="true" />
              <strong>{filename}</strong>
              <span>{pages ? `${pages} · ` : ""}Tap to open the PDF</span>
            </a>
          </>
        ) : (
          <div className="rdp-doc-empty">
            <div className="rdp-doc-empty-icon">
              <FileText size={24} aria-hidden="true" />
            </div>
            <p>No document attached</p>
            <span>
              The original {isTQ ? "TQ" : "change order"} document will appear
              here when the email that raised it has a PDF attachment.
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Right: agent reasoning ────────────────────────────────────────────────────
function AgentLead({ request }) {
  const { headline, detail } = splitSummary(request.agentSummary);

  return (
    <div className="rdp-lead">
      <div className="rdp-lead-avatar" aria-hidden="true">
        <Sparkles size={16} />
      </div>
      <div className="rdp-lead-text">
        {headline ? (
          <>
            <h2 className="rdp-lead-headline">{headline}</h2>
            {detail && <p className="rdp-lead-detail">{detail}</p>}
          </>
        ) : (
          <>
            <h2 className="rdp-lead-headline">
              Agents are processing this request.
            </h2>
            <p className="rdp-lead-detail rdp-pending">
              <Zap size={13} aria-hidden="true" /> The summary and plan will
              appear here when the analysis finishes.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** The plan as a timeline: recommended actions, ending with the reply to the requester. */
function Plan({ actions, request, draft, isTQ }) {
  const replyTo = request.submittedBy || "the requester";

  return (
    <div className="rdp-indent">
      <span className="rdp-kicker">Recommended plan</span>
      <ol className="rdp-plan">
        {actions.map((action, i) => (
          <li key={i} className="rdp-plan-step">
            <span className="rdp-plan-rail" aria-hidden="true">
              <span className="rdp-plan-dot" />
              <span className="rdp-plan-line" />
            </span>
            <div className="rdp-plan-body">
              <span className="rdp-plan-title">{action}</span>
              <span className="rdp-plan-sub">Step {i + 1}</span>
            </div>
          </li>
        ))}
        <li className="rdp-plan-step is-last">
          <span className="rdp-plan-rail" aria-hidden="true">
            <span className="rdp-plan-dot is-open" />
          </span>
          <div className="rdp-plan-body">
            <span className="rdp-plan-title">
              Reply to {replyTo} ·{" "}
              {isTQ ? "technical reply" : "change order response"}
            </span>
            <div className="rdp-reply-preview">
              {draft || (
                <span className="rdp-muted">
                  The agent's draft reply will appear here for your review.
                </span>
              )}
            </div>
          </div>
        </li>
      </ol>
    </div>
  );
}

/**
 * Each agent's response as a step on the same timeline as the plan: dot, title with confidence,
 * muted remit line, and the response (with any flags) in the raised box. Pending agents get an
 * open dot; an agent that raised a danger flag gets a red dot.
 */
function AgentChecks({ agentResponses }) {
  return (
    <div className="rdp-indent">
      <span className="rdp-kicker">Agent Response</span>
      <ol className="rdp-plan">
        {AGENTS.map((agent, i) => {
          const response = agentResponses?.[agent.key];
          const conf = response?.confidence;
          const flags = response?.flags || [];
          const state = !response?.content
            ? "is-pending"
            : flags.some((flag) => flag.severity === "danger")
              ? "is-flagged"
              : "";
          return (
            <li
              key={agent.key}
              className={`rdp-plan-step rdp-check-step ${state} ${i === AGENTS.length - 1 ? "is-last" : ""}`}
            >
              <span className="rdp-plan-rail" aria-hidden="true">
                <span className="rdp-plan-dot" />
                {i < AGENTS.length - 1 && <span className="rdp-plan-line" />}
              </span>
              <div className="rdp-plan-body">
                <span className="rdp-plan-title">
                  {agent.label}
                  {conf != null && (
                    <span
                      className={`rdp-conf-text rdp-conf-text-${confidenceLevel(conf)}`}
                    >
                      {" "}
                      · {conf}% confidence
                    </span>
                  )}
                </span>
                <span className="rdp-plan-sub">
                  {response?.content
                    ? agent.description
                    : `${agent.description} Analysis pending…`}
                </span>
                {response?.content && (
                  <div className="rdp-reply-preview rdp-check-box">
                    {response.content}
                    {flags.length > 0 && (
                      <div className="rdp-flags">
                        {flags.map((flag, j) => (
                          <span
                            key={j}
                            className={`rdp-chip rdp-flag-${flag.severity || "info"}`}
                          >
                            {flag.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Edit dialog ───────────────────────────────────────────────────────────────
function ReplyDialog({ request, draft, onSave, onCancel }) {
  const [value, setValue] = useState(draft);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="rdp-dialog-backdrop" onClick={onCancel}>
      <div
        className="rdp-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rdp-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="rdp-dialog-title" className="rdp-dialog-title">
          Edit the agent's reply
        </h2>
        <dl className="rdp-dialog-fields">
          {request.submittedBy && (
            <>
              <dt>To</dt>
              <dd>{request.submittedBy}</dd>
            </>
          )}
          <dt>Re</dt>
          <dd>
            <span className="technical-id">{request.id}</span>
            {request.title ? ` – ${request.title}` : ""}
          </dd>
        </dl>
        <label className="rdp-field">
          <span>Reply</span>
          <textarea
            className="rdp-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Write the reply to send…"
            autoFocus
          />
        </label>
        <div className="rdp-dialog-actions">
          <button type="button" className="rdp-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="rdp-btn rdp-btn-primary"
            onClick={() => onSave(value)}
          >
            Save reply
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RequestDetailPage({ request, onBack }) {
  const isTQ = request.category === "Technical Query";
  const agentResponses = request.agentResponses || {};
  const statusClass = `rdp-status-${String(request.status)
    .toLowerCase()
    .replaceAll(" ", "-")}`;
  const recommendedActions =
    request.recommendedActions ||
    (request.disposition ? [request.disposition] : []);

  const [draft, setDraft] = useState(request.replyDraft || "");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(draft).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rdp-shell">
      {/* ── Top bar ── */}
      <header className="rdp-topbar">
        <BackButton onClick={onBack} label="Back to requests" />
        <nav className="rdp-crumbs" aria-label="Breadcrumb">
          <ClipboardList size={15} aria-hidden="true" className="rdp-crumb-root" />
          <span className="rdp-crumb-root">Requests</span>
          <ChevronRight size={12} aria-hidden="true" className="rdp-crumb-root" />
          <span
            className={`rdp-type-badge rdp-type-${isTQ ? "query" : "change"}`}
          >
            {isTQ ? "TQ" : "CO"}
          </span>
          <span className="rdp-topbar-id technical-id">{request.id}</span>
          <h1 className="rdp-topbar-title">{request.title}</h1>
        </nav>
        <div className="rdp-topbar-right">
          {request.submittedDate && <span>{request.submittedDate}</span>}
          <span className={`rdp-status-chip ${statusClass}`}>
            {request.status}
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="rdp-body">
        <DocumentPanel request={request} isTQ={isTQ} />

        <section className="rdp-agent" aria-label="Agent analysis">
          <AgentLead request={request} />
          <Plan
            actions={recommendedActions}
            request={request}
            draft={draft}
            isTQ={isTQ}
          />
          <AgentChecks agentResponses={agentResponses} />

          <p className="rdp-indent rdp-note">
            <Info size={12} aria-hidden="true" />
            {flagSummary(agentResponses)}
            {request.agentProcessedAt &&
              ` · analysed ${request.agentProcessedAt}`}
          </p>

          <div className="rdp-indent rdp-actions">
            <button
              type="button"
              className="rdp-btn rdp-btn-primary rdp-btn-lg"
              disabled={!draft}
            >
              <Send size={14} aria-hidden="true" />
              Send via Gmail
            </button>
            <button
              type="button"
              className="rdp-btn rdp-btn-lg"
              onClick={() => setEditing(true)}
            >
              <Pencil size={14} aria-hidden="true" />
              Edit reply
            </button>
            <button
              type="button"
              className="rdp-btn rdp-btn-lg"
              onClick={handleCopy}
              disabled={!draft}
            >
              <Copy size={14} aria-hidden="true" />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </section>
      </div>

      {editing && (
        <ReplyDialog
          request={request}
          draft={draft}
          onCancel={() => setEditing(false)}
          onSave={(value) => {
            setDraft(value);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
