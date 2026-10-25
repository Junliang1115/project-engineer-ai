const segment = (value) => encodeURIComponent(String(value));
const readSegment = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const chatPath = "/";
export const accountPath = "/account";
export const projectsPath = "/projects";
export const projectPath = (projectId) => `${projectsPath}/${segment(projectId)}`;
export const costAnalysisPath = (projectId, phase) =>
  `${projectPath(projectId)}/costs?phase=${segment(phase)}`;
export const activityReviewPath = (projectId, activityId) =>
  `${projectPath(projectId)}/activity/${segment(activityId)}`;
export const requestDetailPath = (projectId, requestId) =>
  `${projectPath(projectId)}/requests/${segment(requestId)}`;

export function parseProjectRoute(pathname, search = "") {
  const parts = pathname.split("/").filter(Boolean).map(readSegment);
  const projectId = parts[0] === "projects" ? parts[1] || null : null;
  const section = parts[2];
  return {
    projectId,
    activityId: section === "activity" ? parts[3] || null : null,
    requestId: section === "requests" ? parts[3] || null : null,
    costPhase: section === "costs"
      ? new URLSearchParams(search).get("phase") || "Construction"
      : null,
  };
}
