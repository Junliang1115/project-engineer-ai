const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:8000" : "/api");

export async function fetchProjects() {
  const response = await fetch(`${API_BASE_URL}/projects`);
  if (!response.ok) {
    throw new Error(`Projects API failed: ${response.status}`);
  }
  return response.json();
}

export async function fetchProjectsMeta() {
  const response = await fetch(`${API_BASE_URL}/projects-meta`);
  if (!response.ok) {
    return { last_updated: null };
  }
  return response.json();
}

async function requestJson(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || `Request failed with status ${response.status}`);
  }
  return data;
}

const postJson = (path, body) =>
  requestJson(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Review details of one email activity: reason, proposed changes with current values and edit fields. */
export const fetchActivityReview = (activityId) => requestJson(`/activities/${activityId}/review`);

/** URL of a stored PDF (saved locally by the backend), for links and iframes. */
export const documentFileUrl = (documentId) => `${API_BASE_URL}/documents/${documentId}/file`;

/** The original email, read from Gmail by the backend. */
export const fetchActivityEmail = (activityId) => requestJson(`/activities/${activityId}/email`);

/** Approve (optionally with edited changes / record ID) or reject one proposed change. */
export const decideActivityAction = (activityId, index, decision) =>
  postJson(`/activities/${activityId}/actions/${index}`, decision);

/** Close the review; undecided changes are rejected with the note. */
export const closeActivityReview = (activityId, note) => postJson(`/activities/${activityId}/close`, { note });

export async function triggerScanUpdates(options = {}) {
  const queryParams = new URLSearchParams();
  if (options.query) queryParams.set("query", options.query);
  if (options.limit) queryParams.set("limit", options.limit);
  if (options.dry_run) queryParams.set("dry_run", "true");

  const url = `${API_BASE_URL}/scan-gmail?${queryParams.toString()}`;
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Scan failed with status ${response.status}`);
  }
  return response.json();
}
