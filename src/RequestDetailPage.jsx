import React, { useState } from "react";
import {
  ArrowLeft,
  Bot,
  AlertTriangle,
  Shield,
  Wrench,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Copy,
  Send,
  CheckCircle,
  Clock,
  Zap,
  Info,
} from "lucide-react";
import "./RequestDetail.css";

// ── Agent config ──────────────────────────────────────────────────────────────
const AGENTS = [
  {
    key: "risk",
    label: "Risk Agent",
    icon: AlertTriangle,
    colorKey: "danger",
    description: "Evaluates schedule, cost, and safety risk exposure.",
  },
  {
    key: "compliance",
    label: "Compliance Agent",
    icon: Shield,
    colorKey: "success",
    description: "Checks regulatory, HSE, and contractual compliance.",
  },
  {
    key: "technical",
    label: "Technical Agent",
    icon: Wrench,
    colorKey: "info",
    description: "Provides engineering and technical disposition.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function confidenceLevel(conf) {
  if (conf == null) return "low";
  if (conf >= 80) return "high";
  if (conf >= 60) return "medium";
  return "low";
}

/** Derive summary-level tags from agent responses */
function deriveSummaryTags(agentResponses) {
  const tags = [];
  const r = agentResponses || {};

  if (r.risk?.confidence != null) {
    const lvl = confidenceLevel(r.risk.confidence);
    tags.push({ label: `Risk: ${lvl}`, type: lvl === "high" ? "success" : lvl === "medium" ? "warning" : "danger" });
  }
  if (r.compliance?.confidence != null) {
    const lvl = confidenceLevel(r.compliance.confidence);
    tags.push({ label: "Compliance check", type: lvl === "high" ? "success" : "warning" });
  }
  if (r.technical?.confidence != null) {
    tags.push({ label: "Technical review", type: "info" });
  }
  // collect any flags
  const allFlags = [
    ...(r.risk?.flags || []),
    ...(r.compliance?.flags || []),
    ...(r.technical?.flags || []),
  ];
  if (allFlags.length > 0) {
    tags.push({ label: `${allFlags.length} flag${allFlags.length > 1 ? "s" : ""} raised`, type: "warning" });
  }
  return tags;
}

// ── PDF Viewer ────────────────────────────────────────────────────────────────
function PdfViewer({ request }) {
  const hasAttachment = Boolean(request.attachmentUrl);
  const filename = request.attachmentName || `${request.id}_document.pdf`;

  return (
    <div className="rdp-pdf-panel">
      <div className="rdp-pdf-header">
        <div className="rdp-pdf-file-icon">
          <FileText size={14} aria-hidden="true" />
        </div>
        <div className="rdp-pdf-info">
          <div className="rdp-pdf-filename">{filename}</div>
          <div className="rdp-pdf-filemeta">
            {request.attachmentSize
              ? `${request.attachmentSize} · `
              : ""}
            {request.submittedDate || ""}
          </div>
        </div>
        {hasAttachment && (
          <a
            href={request.attachmentUrl}
            download
            className="rdp-pdf-download"
            aria-label="Download attachment"
          >
            <Download size={13} aria-hidden="true" />
            Download
          </a>
        )}
      </div>
      <div className="rdp-pdf-body">
        {hasAttachment ? (
          <iframe
            src={request.attachmentUrl}
            className="rdp-pdf-frame"
            title={`Attachment for ${request.id}`}
          />
        ) : (
          <div className="rdp-pdf-empty">
            <div className="rdp-pdf-empty-icon">
              <FileText size={26} aria-hidden="true" />
            </div>
            <p>No document attached</p>
            <span>
              The original{" "}
              {request.category === "Technical Query" ? "TQ" : "change order"}{" "}
              document will appear here when uploaded.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Overall Summary ───────────────────────────────────────────────────────────
function OverallSummary({ request }) {
  const summary = request.agentSummary;
  const tags = deriveSummaryTags(request.agentResponses);

  return (
    <div className="rdp-summary-card">
      <div className="rdp-summary-inner">
        <div className="rdp-summary-head">
          <div className="rdp-summary-avatar">
            <Bot size={16} aria-hidden="true" />
          </div>
          <div className="rdp-summary-meta">
            <h3>OilAgent Summary</h3>
            <p>Multi-agent analysis · {AGENTS.length} agents</p>
          </div>
          {request.agentProcessedAt && (
            <div className="rdp-processed-time">
              <Clock size={11} aria-hidden="true" />
              {request.agentProcessedAt}
            </div>
          )}
        </div>

        {summary ? (
          <p className="rdp-summary-body">{summary}</p>
        ) : (
          <div className="rdp-pending-state">
            <Zap size={13} aria-hidden="true" />
            <span>Agents are processing this request…</span>
          </div>
        )}

        {tags.length > 0 && (
          <div className="rdp-summary-tags">
            {tags.map((tag, i) => (
              <span key={i} className={`rdp-summary-tag rdp-stag-${tag.type}`}>
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Individual Agent Response ─────────────────────────────────────────────────
function AgentResponseCard({ agent, response }) {
  const [open, setOpen] = useState(true);
  const Icon = agent.icon;
  const hasResponse = Boolean(response?.content);
  const conf = response?.confidence;
  const confLevel = confidenceLevel(conf);

  return (
    <div className="rdp-agent-card">
      <button
        type="button"
        className="rdp-agent-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className={`rdp-agent-icon-wrap rdp-agent-icon-${agent.colorKey}`}>
          <Icon size={13} aria-hidden="true" />
        </div>

        <div className="rdp-agent-card-meta">
          <div className="rdp-agent-label">{agent.label}</div>
          <div className="rdp-agent-desc">{agent.description}</div>
        </div>

        <div className="rdp-agent-card-right">
          {conf != null && (
            <div className="rdp-conf-wrap">
              <span className="rdp-conf-label">{conf}% confidence</span>
              <div className="rdp-conf-bar">
                <div
                  className={`rdp-conf-fill rdp-conf-fill-${confLevel}`}
                  style={{ width: `${conf}%` }}
                />
              </div>
            </div>
          )}
          <div className="rdp-agent-toggle">
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </div>
        </div>
      </button>

      {open && (
        <div className="rdp-agent-body">
          {hasResponse ? (
            <>
              <p className="rdp-agent-response">{response.content}</p>
              {response.flags?.length > 0 && (
                <div className="rdp-agent-flags">
                  {response.flags.map((flag, i) => (
                    <span
                      key={i}
                      className={`rdp-flag rdp-flag-${flag.severity || "info"}`}
                    >
                      {flag.label}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="rdp-pending-state">
              <Zap size={13} aria-hidden="true" />
              <span>Analysis pending…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Recommended Actions ───────────────────────────────────────────────────────
function RecommendedActions({ actions }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="rdp-actions-wrap">
      <div className="rdp-actions-head">
        <div className="rdp-actions-head-icon">
          <CheckCircle size={14} aria-hidden="true" />
        </div>
        <span className="rdp-actions-title">Recommended Actions</span>
        <span className="rdp-actions-count">{actions.length}</span>
      </div>
      <div className="rdp-steps">
        {actions.map((action, i) => (
          <div key={i} className="rdp-step">
            <div className="rdp-step-num">{i + 1}</div>
            <div className="rdp-step-text">{action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Reply Draft ───────────────────────────────────────────────────────────────
function ReplyDraft({ request }) {
  const isTQ = request.category === "Technical Query";
  const [draft, setDraft] = useState(request.replyDraft || "");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(draft).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rdp-reply-wrap">
      <div className="rdp-reply-head">
        <div className="rdp-reply-head-icon">
          <Send size={14} aria-hidden="true" />
        </div>
        <span className="rdp-reply-title">
          {isTQ ? "Technical Reply" : "Change Order Response"}
        </span>
        <span className="rdp-reply-subtitle">Draft · review before sending</span>
      </div>

      {/* To / Re fields */}
      <div className="rdp-reply-fields">
        {request.submittedBy && (
          <div className="rdp-reply-field">
            <span className="rdp-field-label">To</span>
            <span className="rdp-field-value">
              <strong>{request.submittedBy}</strong>
            </span>
          </div>
        )}
        <div className="rdp-reply-field">
          <span className="rdp-field-label">Re</span>
          <span className="rdp-field-value">
            <strong className="technical-id">{request.id}</strong>
            {request.title ? ` – ${request.title}` : ""}
          </span>
        </div>
      </div>

      <div className="rdp-reply-body">
        <textarea
          className="rdp-reply-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            isTQ
              ? "Agent-generated technical reply will appear here for your review and editing…"
              : "Agent-generated change order response will appear here for your review and editing…"
          }
          aria-label="Reply draft"
        />
      </div>

      <div className="rdp-reply-footer">
        <span className="rdp-reply-hint">
          <Info size={11} aria-hidden="true" />
          Drafted by OilAgent · review before sending
        </span>
        <button
          type="button"
          className="rdp-reply-btn rdp-reply-copy"
          onClick={handleCopy}
        >
          <Copy size={13} aria-hidden="true" />
          {copied ? "Copied!" : "Copy"}
        </button>
        <button type="button" className="rdp-reply-btn rdp-reply-send">
          <Send size={13} aria-hidden="true" />
          Send via Gmail
        </button>
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

  return (
    <div className="rdp-shell">
      {/* ── Top bar ── */}
      <header className="rdp-topbar">
        <button
          type="button"
          className="rdp-back-btn"
          onClick={onBack}
          aria-label="Back to requests"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Requests</span>
        </button>

        <div className="rdp-topbar-div" aria-hidden="true" />

        <div className="rdp-topbar-meta">
          <span className={`rdp-type-badge rdp-type-${isTQ ? "query" : "change"}`}>
            {isTQ ? "TQ" : "CO"}
          </span>
          <span className="rdp-topbar-id technical-id">{request.id}</span>
          <span className="rdp-topbar-sep" aria-hidden="true">›</span>
          <h1 className="rdp-topbar-title">{request.title}</h1>
        </div>

        <div className="rdp-topbar-right">
          {request.submittedDate && (
            <span className="rdp-meta-chip">
              <Clock size={10} aria-hidden="true" />
              {request.submittedDate}
            </span>
          )}
          <span className={`rdp-status-chip ${statusClass}`}>
            {request.status}
          </span>
        </div>
      </header>

      {/* ── Two-panel body ── */}
      <div className="rdp-body">
        {/* Left: document */}
        <PdfViewer request={request} />

        {/* Right: agent panel */}
        <div className="rdp-agent-panel">
          {/* Overall summary */}
          <OverallSummary request={request} />

          {/* Per-agent responses */}
          <div className="rdp-agents-heading">
            <span className="rdp-agents-heading-label">Agent Responses</span>
            <div className="rdp-agents-heading-line" />
          </div>

          <div className="rdp-agents-list">
            {AGENTS.map((agent) => (
              <AgentResponseCard
                key={agent.key}
                agent={agent}
                response={agentResponses[agent.key]}
              />
            ))}
          </div>

          {/* Recommended actions */}
          <RecommendedActions actions={recommendedActions} />

          {/* Reply draft */}
          <ReplyDraft request={request} />
        </div>
      </div>
    </div>
  );
}
