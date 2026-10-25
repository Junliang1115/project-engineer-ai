// Pure helpers for the email review page (kept separate so they can be tested without React).

const ENTITY_LABELS = {
  project: "project",
  project_phase: "phase",
  milestone: "milestone",
  project_task: "task",
  expenditure: "expenditure",
  risk_register: "risk",
  lesson: "lesson",
  request: "request",
};

/** "Update task TSK-103" / "Create request". */
export function describeProposal(proposal) {
  const verb = proposal.operation === "create" ? "Create" : "Update";
  const entity = ENTITY_LABELS[proposal.entity] || proposal.entity || "record";
  return [verb, entity, proposal.operation === "update" ? proposal.record_id : ""].filter(Boolean).join(" ");
}

/** Turn a form input string into the value type the database field expects. */
export function coerceFieldValue(spec, raw) {
  const text = String(raw ?? "").trim();
  if (text === "") return null;
  if (spec?.type === "integer") return Number.parseInt(text, 10);
  if (spec?.type === "number") return Number(text);
  if (spec?.type === "string_list") return text.split(",").map((item) => item.trim()).filter(Boolean);
  return text;
}

/** Build the edited change set; empty inputs drop the field. Returns { changes, errors }. */
export function buildEditedChanges(fields, values) {
  const changes = {};
  const errors = [];
  Object.entries(values).forEach(([field, raw]) => {
    const value = coerceFieldValue(fields?.[field], raw);
    if (value === null) return;
    if (typeof value === "number" && Number.isNaN(value)) {
      errors.push(`${field} must be a number`);
      return;
    }
    changes[field] = value;
  });
  if (Object.keys(changes).length === 0) errors.push("Keep at least one change");
  return { changes, errors };
}

/** Is the action check the pipeline stored a pass? */
export const checkPassed = (proposal) => proposal.check === "ok";

/** Display value for a field (null, lists, numbers). */
export function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/** The email quotes a proposal cites (reviewer-set values have no quote in the email). */
export function evidenceQuotes(proposal) {
  const evidence = proposal?.evidence;
  const quotes = typeof evidence === "string" ? [evidence] : Object.values(evidence || {});
  return [...new Set(quotes.filter((quote) => typeof quote === "string" && quote.trim() && quote !== "Set by reviewer"))];
}

// Match a quote across line breaks and spacing differences; drop wrapping quote marks and ellipses.
function quotePattern(quote) {
  const words = quote
    .trim()
    .replace(/^["'“”‘’…\s]+|["'“”‘’…\s.]+$/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return words.length ? new RegExp(words.join("\\s+"), "i") : null;
}

/**
 * Split the email body into segments, tagging the text each proposal cites with that proposal's index.
 * Returns { segments: [{ text, ref }], found: Set<index> }; ref is null for uncited text.
 */
export function linkEvidence(body, proposals) {
  const text = String(body || "");
  const ranges = [];
  (proposals || []).forEach((proposal, ref) => {
    evidenceQuotes(proposal).forEach((quote) => {
      const pattern = quotePattern(quote);
      const match = pattern && pattern.exec(text);
      if (match) ranges.push({ start: match.index, end: match.index + match[0].length, ref });
    });
  });
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);

  const segments = [];
  const found = new Set();
  let cursor = 0;
  ranges.forEach(({ start, end, ref }) => {
    if (start < cursor) return; // overlaps an earlier citation; keep the first
    if (start > cursor) segments.push({ text: text.slice(cursor, start), ref: null });
    segments.push({ text: text.slice(start, end), ref });
    found.add(ref);
    cursor = end;
  });
  if (cursor < text.length) segments.push({ text: text.slice(cursor), ref: null });
  return { segments, found };
}

export const REVIEW_STATE_LABELS = {
  needs_review: "Needs review",
  applied: "Done",
  no_change: "Done",
  rejected: "Rejected",
};
