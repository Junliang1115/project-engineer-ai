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
