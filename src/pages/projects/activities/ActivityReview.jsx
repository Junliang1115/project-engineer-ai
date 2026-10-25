import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  Inbox,
  Paperclip,
  Pencil,
  Quote,
  Sparkles,
  X,
} from "lucide-react";
import {
  closeActivityReview,
  decideActivityAction,
  documentFileUrl,
  fetchActivityEmail,
  fetchActivityReview,
} from "../../../services/api.js";
import {
  REVIEW_STATE_LABELS,
  buildEditedChanges,
  checkPassed,
  describeProposal,
  evidenceQuotes,
  formatValue,
  linkEvidence,
} from "./activityReview.js";
import BackButton from "../../../components/BackButton.jsx";
import "./ActivityReview.css";

const initials = (from) =>
  String(from || "?")
    .replace(/<.*>/, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("") || "?";

const formatReceived = (iso) => (iso ? iso.slice(0, 16).replace("T", " ") : "");

// Email attachments; PDFs the scanner stored locally open from the backend (GET /documents/{id}/file).
function AttachmentList({ names, documents = [] }) {
  const byName = new Map(documents.map((doc) => [doc.filename, doc]));
  const all = [...new Set([...names, ...documents.map((doc) => doc.filename)])];
  if (all.length === 0) return null;
  return (
    <ul className="erp-attachments" aria-label="Attachments">
      {all.map((name) => {
        const doc = byName.get(name);
        const detail = !doc
          ? null
          : doc.status === "parsed"
            ? `${doc.pageCount} page${doc.pageCount === 1 ? "" : "s"}`
            : doc.status === "failed"
              ? "not readable"
              : "stored";
        return (
          <li key={name}>
            <Paperclip size={14} aria-hidden="true" />
            {doc ? (
              <a
                href={documentFileUrl(doc.documentId)}
                target="_blank"
                rel="noreferrer"
                title={doc.error || "Open the stored PDF"}
              >
                {name}
              </a>
            ) : (
              name
            )}
            {detail && <span className="erp-attachment-meta">{detail}</span>}
          </li>
        );
      })}
    </ul>
  );
}

// ── Left: the original email, with each cited sentence linked to its change ─
function EmailPanel({
  email,
  error,
  loading,
  review,
  active,
  onHover,
  markRefs,
}) {
  const { segments } = useMemo(
    () => linkEvidence(email?.body, review.proposals),
    [email?.body, review.proposals],
  );

  return (
    <section className="erp-email" aria-label="Original email">
      <h2 className="erp-email-subject">
        {email?.subject || review.title || "Original email"}
      </h2>
      <div className="erp-sender">
        <span className="erp-avatar" aria-hidden="true">
          {initials(email?.from || review.sender)}
        </span>
        <div className="erp-sender-lines">
          <span>{email?.from || review.sender || "Unknown sender"}</span>
          {email?.to && <span className="erp-muted">to {email.to}</span>}
        </div>
        <span className="erp-sender-date">
          {email?.date || formatReceived(review.receivedAt)}
        </span>
      </div>

      {loading && <p className="erp-muted">Loading email from Gmail…</p>}
      {!loading && error && (
        <div className="erp-email-error">
          <p className="erp-warning-line">
            <AlertTriangle size={14} aria-hidden="true" /> Email could not be
            loaded: {error}
          </p>
          <p className="erp-muted">
            Showing what the pipeline recorded instead.
          </p>
          {review.summary && <p className="erp-email-text">{review.summary}</p>}
          {review.evidence && (
            <blockquote className="erp-quote">{review.evidence}</blockquote>
          )}
        </div>
      )}
      {!loading && email && (
        <>
          <div className="erp-email-text">
            {segments.length === 0
              ? "(empty body)"
              : segments.map((segment, i) =>
                  segment.ref === null ? (
                    <React.Fragment key={i}>{segment.text}</React.Fragment>
                  ) : (
                    <mark
                      key={i}
                      ref={(node) => markRefs.current.set(segment.ref, node)}
                      className={`erp-cite${active === segment.ref ? " is-active" : ""}`}
                      onMouseEnter={() => onHover(segment.ref)}
                      onMouseLeave={() => onHover(null)}
                    >
                      {segment.text}
                      <sup>{segment.ref + 1}</sup>
                    </mark>
                  ),
                )}
          </div>
          <AttachmentList
            names={(email.attachments || []).map((file) => file.filename)}
            documents={review.documents}
          />
        </>
      )}
      {!loading && !email && (
        <AttachmentList names={[]} documents={review.documents} />
      )}
      <p className="erp-muted erp-email-source">Read from Gmail</p>
    </section>
  );
}

// The date tag only appears when a task status change needs a reported date.
const DATE_TAGS = {
  ok: (date) => ({ label: `Reported ${date}`, warning: false }),
  missing: () => ({ label: "Reported date missing", warning: true }),
  unverified: (date) => ({
    label: `Reported ${date} · quote not found in email`,
    warning: true,
  }),
  unsupported: () => ({ label: "Reported date not in email", warning: true }), // Rows logged before AI dates.
};

// Other dates the model read from the email, by meaning (the reported date has its own tag).
const DATE_KIND_LABELS = {
  planned: "Planned",
  due: "Due",
  delayed_to: "Delayed to",
  other: "Date",
};

// ── Right, top: what the email asks for, and anything that needs attention ───
function ReviewSummary({ review }) {
  const warnings = review.warnings || [];
  const dateTag = DATE_TAGS[review.dateStatus]?.(review.reportedDate);
  const dates = review.dates || [];
  const reportedQuote = dates.find(
    (entry) => entry.kind === "reported",
  )?.evidence;
  const otherDates = dates.filter((entry) => entry.kind !== "reported");
  return (
    <section className="erp-summary" aria-label="Review summary">
      <div className="erp-summary-head">
        <span className="erp-kicker">
          <Sparkles size={13} aria-hidden="true" /> Agent Summary
        </span>
        <div className="erp-tags">
          {review.categories.map((category) => (
            <span key={category} className="erp-tag">
              {category.replaceAll("_", " ")}
            </span>
          ))}
          {dateTag && (
            <span
              className={`erp-tag${dateTag.warning ? " erp-tag-warning" : ""}`}
              title={reportedQuote ? `"${reportedQuote}"` : undefined}
            >
              {dateTag.label}
            </span>
          )}
          {otherDates.map((entry) => (
            <span
              key={`${entry.kind}-${entry.date}`}
              className="erp-tag"
              title={`"${entry.evidence}"`}
            >
              {DATE_KIND_LABELS[entry.kind] || "Date"} {entry.date}
            </span>
          ))}
        </div>
      </div>
      <p className="erp-summary-text">
        {review.summary || "No summary was recorded for this email."}
      </p>
      {warnings.length > 0 && (
        <ul className="erp-reasons" aria-label="Needs attention">
          {warnings.map((warning) => (
            <li key={warning}>
              <AlertTriangle size={13} aria-hidden="true" /> {warning}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── One proposed change ─────────────────────────────────────────────────────
const toInputValue = (value) =>
  value == null ? "" : Array.isArray(value) ? value.join(", ") : String(value);

function ProposalItem({
  proposal,
  index,
  isOpen,
  linked,
  active,
  onHover,
  onLocate,
  onDecide,
}) {
  const [mode, setMode] = useState("view"); // view | edit | reject
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      Object.entries(proposal.changes || {}).map(([field, value]) => [
        field,
        toInputValue(value),
      ]),
    ),
  );
  const [recordId, setRecordId] = useState(proposal.record_id || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fields = proposal.fields || {};
  const review = proposal.review;
  const passed = checkPassed(proposal);
  // Quotes already underlined in the email don't need repeating here.
  const quotes = linked ? [] : evidenceQuotes(proposal);

  const submit = async (decision) => {
    setBusy(true);
    setError("");
    try {
      await onDecide(index, decision);
      setMode("view");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const approveEdited = () => {
    const { changes, errors } = buildEditedChanges(fields, values);
    if (errors.length) {
      setError(errors.join("; "));
      return;
    }
    submit({
      decision: "approve",
      changes,
      record_id: proposal.operation === "update" ? recordId : undefined,
    });
  };

  const cancel = () => {
    setMode("view");
    setError("");
  };

  const classes = [
    "erp-item",
    active ? "is-active" : "",
    review ? `is-${review.decision}` : "",
  ].join(" ");
  const confidence = proposal.confidence || "unknown";

  return (
    <article
      className={classes}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Header row: number, title, then confidence / check / decision chips on the right. */}
      <div className="erp-item-head">
        <button
          type="button"
          className="erp-num"
          onClick={() => onLocate(index)}
          disabled={!linked}
          title={linked ? "Show in email" : "Not quoted in the email"}
        >
          {index + 1}
        </button>
        <span className="erp-item-name">{describeProposal(proposal)}</span>
        <div className="erp-item-chips">
          <span
            className={`erp-chip erp-confidence-${proposal.confidence || "low"}`}
          >
            {confidence.charAt(0).toUpperCase() + confidence.slice(1)}{" "}
            confidence
          </span>
          {!passed && (
            <span className="erp-chip erp-check-failed" title={proposal.check}>
              Check failed
            </span>
          )}
          {review && (
            <span className={`erp-chip erp-decided is-${review.decision}`}>
              {review.decision === "approved"
                ? `Approved${review.record_id ? ` · ${review.record_id}` : ""}`
                : "Rejected"}
            </span>
          )}
        </div>
      </div>

      <div className="erp-item-main">
        {!passed && proposal.check && (
          <p className="erp-check-detail">{proposal.check}</p>
        )}
        {/* Grounding warnings for this change, e.g. an ID matched by name rather than written in the email. */}
        {proposal.warnings?.map((warning) => (
          <p key={warning} className="erp-item-warning">
            <AlertTriangle size={13} aria-hidden="true" /> {warning}
          </p>
        ))}

        {mode === "edit" ? (
          <div className="erp-edit">
            {proposal.operation === "update" && (
              <label className="erp-field">
                <span>Record ID</span>
                <input
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value)}
                />
              </label>
            )}
            {Object.keys(values).map((field) => (
              <FieldInput
                key={field}
                field={field}
                spec={fields[field]}
                value={values[field]}
                onChange={(value) =>
                  setValues((prev) => ({ ...prev, [field]: value }))
                }
              />
            ))}
            <AddField
              fields={fields}
              used={values}
              operation={proposal.operation}
              onAdd={(field) => setValues((prev) => ({ ...prev, [field]: "" }))}
            />
          </div>
        ) : (
          <ul className="erp-diffs">
            {Object.entries(
              review?.applied_changes || proposal.changes || {},
            ).map(([field, value]) => {
              const current = proposal.current?.[field];
              return (
                <li key={field}>
                  <span className="erp-diff-field">{field}</span>
                  {proposal.current ? (
                    <span className="erp-diff-old">{formatValue(current)}</span>
                  ) : (
                    <span className="erp-diff-new-tag">new</span>
                  )}
                  <ArrowRight
                    size={12}
                    aria-hidden="true"
                    className="erp-diff-arrow"
                  />
                  <span className="erp-diff-new">{formatValue(value)}</span>
                </li>
              );
            })}
          </ul>
        )}

        {mode !== "edit" &&
          quotes.map((quote) => (
            <blockquote key={quote} className="erp-quote">
              <Quote size={12} aria-hidden="true" /> {quote}
            </blockquote>
          ))}

        {mode === "reject" && (
          <textarea
            className="erp-input erp-note-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why is this change rejected?"
            aria-label="Rejection note"
            autoFocus
          />
        )}
        {error && (
          <p className="erp-error" role="alert">
            {error}
          </p>
        )}
        {mode === "edit" && (
          <div className="erp-actions">
            <button
              type="button"
              className="erp-btn erp-btn-primary"
              disabled={busy}
              onClick={approveEdited}
            >
              <Check size={14} aria-hidden="true" /> Save &amp; approve
            </button>
            <button
              type="button"
              className="erp-btn"
              disabled={busy}
              onClick={cancel}
            >
              Cancel
            </button>
          </div>
        )}
        {mode === "reject" && (
          <div className="erp-actions">
            <button
              type="button"
              className="erp-btn erp-btn-danger"
              disabled={busy || !note.trim()}
              onClick={() => submit({ decision: "reject", note })}
            >
              <X size={14} aria-hidden="true" /> Confirm reject
            </button>
            <button
              type="button"
              className="erp-btn"
              disabled={busy}
              onClick={cancel}
            >
              Cancel
            </button>
          </div>
        )}
        {review?.note && (
          <p className="erp-muted erp-review-note">{review.note}</p>
        )}
      </div>

      {/* Decision buttons stay at the bottom of the card. */}
      {!review && isOpen && mode === "view" && (
        <div className="erp-item-actions">
          {/* Edit on the left; the decision pair (reject, approve) together on the right. */}
          <button
            type="button"
            className="erp-icon-btn erp-btn-outline"
            title="Edit"
            aria-label="Edit"
            disabled={busy}
            onClick={() => setMode("edit")}
          >
            <Pencil size={18} aria-hidden="true" />
          </button>
          <div className="erp-decision-pair">
            <button
              type="button"
              className="erp-icon-btn erp-btn-outline erp-btn-reject"
              title="Reject"
              aria-label="Reject"
              disabled={busy}
              onClick={() => setMode("reject")}
            >
              <X size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="erp-icon-btn erp-btn-outline erp-btn-approve"
              title={
                passed
                  ? "Approve"
                  : "Approve (the check failed, so this may be refused)"
              }
              aria-label="Approve"
              disabled={busy}
              onClick={() => submit({ decision: "approve" })}
            >
              <Check size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function FieldInput({ field, spec, value, onChange }) {
  const common = { value, onChange: (e) => onChange(e.target.value) };
  let input;
  if (spec?.allowed_values) {
    input = (
      <select {...common}>
        <option value="">—</option>
        {spec.allowed_values.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  } else if (spec?.type === "date") {
    input = <input type="date" {...common} />;
  } else if (spec?.type === "number" || spec?.type === "integer") {
    input = (
      <input
        type="number"
        step={spec.type === "integer" ? 1 : "any"}
        min={spec.minimum}
        {...common}
      />
    );
  } else {
    input = (
      <input
        {...common}
        placeholder={spec?.type === "string_list" ? "comma, separated" : ""}
      />
    );
  }
  return (
    <label className="erp-field">
      <span>{field}</span>
      {input}
    </label>
  );
}

function AddField({ fields, used, operation, onAdd }) {
  const available = Object.keys(fields).filter(
    (field) =>
      !(field in used) &&
      !(operation === "update" && fields[field].create_only),
  );
  if (available.length === 0) return null;
  return (
    <label className="erp-field erp-add-field">
      <span>Add field</span>
      <select
        value=""
        onChange={(e) => e.target.value && onAdd(e.target.value)}
      >
        <option value="">Choose a field…</option>
        {available.map((field) => (
          <option key={field} value={field}>
            {field}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── Footer: approve the rest, or close (rejecting the rest) ─────────────────
function ReviewFooter({ review, onApproveRemaining, onClose }) {
  const [mode, setMode] = useState("view"); // view | close
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const undecided = review.proposals.filter((proposal) => !proposal.review);
  const approvable = undecided.filter(checkPassed).length;

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
      setMode("view");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (mode === "close") {
    return (
      <footer className="erp-footer is-closing">
        <p className="erp-muted">
          {undecided.length > 0
            ? `${undecided.length} undecided change${undecided.length > 1 ? "s" : ""} will be rejected with this note.`
            : "Mark this email as reviewed. Make any manual fixes in the project records first."}
        </p>
        <textarea
          className="erp-input erp-note-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            undecided.length > 0 ? "Reason (required)" : "Note (optional)"
          }
          aria-label="Review note"
          autoFocus
        />
        {error && (
          <p className="erp-error" role="alert">
            {error}
          </p>
        )}
        <div className="erp-actions">
          <button
            type="button"
            className={`erp-btn ${undecided.length > 0 ? "erp-btn-danger" : "erp-btn-primary"}`}
            disabled={busy || (undecided.length > 0 && !note.trim())}
            onClick={() => run(() => onClose(note))}
          >
            {undecided.length > 0 ? (
              <X size={14} aria-hidden="true" />
            ) : (
              <Check size={14} aria-hidden="true" />
            )}
            {undecided.length > 0 ? "Reject remaining" : "Close review"}
          </button>
          <button
            type="button"
            className="erp-btn"
            disabled={busy}
            onClick={() => setMode("view")}
          >
            Cancel
          </button>
        </div>
      </footer>
    );
  }

  return (
    <footer className="erp-footer">
      {error && (
        <p className="erp-error erp-footer-error" role="alert">
          {error}
        </p>
      )}
      {/* Reject and approve together on the right, matching the cards. */}
      <div className="erp-decision-pair">
        <button
          type="button"
          className={`erp-btn ${undecided.length > 0 ? "erp-btn-outline erp-btn-reject" : ""}`}
          disabled={busy}
          onClick={() => setMode("close")}
        >
          {undecided.length > 0 ? (
            <>
              <X size={18} aria-hidden="true" /> Reject
            </>
          ) : (
            "Close review"
          )}
        </button>
        {approvable > 0 && (
          <button
            type="button"
            className="erp-btn erp-btn-outline erp-btn-approve"
            disabled={busy}
            onClick={() => run(onApproveRemaining)}
          >
            <CheckCheck size={18} aria-hidden="true" /> Approve ({approvable})
          </button>
        )}
      </div>
    </footer>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function ActivityReview({ activityId, onBack, onReviewed }) {
  const [review, setReview] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [email, setEmail] = useState(null);
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(true);
  const [active, setActive] = useState(null);
  const markRefs = useRef(new Map());

  const loadReview = useCallback(async () => {
    try {
      setReview(await fetchActivityReview(activityId));
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    }
  }, [activityId]);

  useEffect(() => {
    loadReview();
    setEmailLoading(true);
    fetchActivityEmail(activityId)
      .then((data) => {
        setEmail(data);
        setEmailError("");
      })
      .catch((err) => setEmailError(err.message))
      .finally(() => setEmailLoading(false));
  }, [activityId, loadReview]);

  const linked = useMemo(
    () =>
      review ? linkEvidence(email?.body, review.proposals).found : new Set(),
    [email?.body, review],
  );

  const afterChange = async () => {
    await loadReview();
    onReviewed?.();
  };

  const handleDecide = async (index, decision) => {
    await decideActivityAction(activityId, index, decision);
    await afterChange();
  };

  // Approve each undecided change whose check passed, one request at a time; stop at the first failure.
  const handleApproveRemaining = async () => {
    try {
      for (const [index, proposal] of review.proposals.entries()) {
        if (!proposal.review && checkPassed(proposal)) {
          await decideActivityAction(activityId, index, {
            decision: "approve",
          });
        }
      }
    } finally {
      await afterChange();
    }
  };

  const handleClose = async (note) => {
    await closeActivityReview(activityId, note);
    await afterChange();
  };

  const locate = (index) => {
    markRefs.current
      .get(index)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setActive(index);
  };

  const isOpen = review?.state === "needs_review";
  const stateLabel = REVIEW_STATE_LABELS[review?.state] || review?.state || "";
  const total = review?.proposals.length || 0;
  const decided =
    review?.proposals.filter((proposal) => proposal.review).length || 0;

  return (
    <div className="erp-shell">
      <header className="erp-topbar">
        <BackButton onClick={onBack} label="Back to activity log" />
        <nav className="erp-crumbs" aria-label="Breadcrumb">
          <Inbox size={15} aria-hidden="true" />
          <span>Activity review</span>
          <ChevronRight size={12} aria-hidden="true" />
          <h1>{review?.title || "Email review"}</h1>
        </nav>
        <div className="erp-topbar-right">
          {total > 0 && (
            <>
              <span>
                {decided} of {total} decided
              </span>
              <span className="erp-progress" aria-hidden="true">
                <span style={{ width: `${(decided / total) * 100}%` }} />
              </span>
            </>
          )}
          {stateLabel && (
            <span className={`erp-status erp-state-${review.state}`}>
              {stateLabel}
            </span>
          )}
        </div>
      </header>

      {loadError ? (
        <p className="erp-error erp-page-error" role="alert">
          {loadError}
        </p>
      ) : !review ? (
        <p className="erp-muted erp-page-error">Loading review…</p>
      ) : (
        <div className="erp-body">
          <EmailPanel
            email={email}
            error={emailError}
            loading={emailLoading}
            review={review}
            active={active}
            onHover={setActive}
            markRefs={markRefs}
          />
          <div className="erp-panel">
            <ReviewSummary review={review} />
            <section className="erp-changes" aria-label="Proposed changes">
              <span className="erp-kicker">Proposed changes · {total}</span>
              {total === 0 ? (
                <p className="erp-muted">
                  The email proposed no changes. Fix the records by hand if
                  needed, then close the review.
                </p>
              ) : (
                review.proposals.map((proposal, index) => (
                  <ProposalItem
                    key={`${activityId}-${index}`}
                    proposal={proposal}
                    index={index}
                    isOpen={isOpen}
                    linked={linked.has(index)}
                    active={active === index}
                    onHover={setActive}
                    onLocate={locate}
                    onDecide={handleDecide}
                  />
                ))
              )}
            </section>
            {isOpen ? (
              <ReviewFooter
                review={review}
                onApproveRemaining={handleApproveRemaining}
                onClose={handleClose}
              />
            ) : review.review?.note ? (
              <p className="erp-muted">Review note: {review.review.note}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
