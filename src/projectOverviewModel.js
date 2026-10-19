const DAY = 86_400_000;

const dateValue = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isClosed = (status = "") =>
  ["closed", "complete", "completed"].includes(status.toLowerCase());

const dotColorForRisk = (priority = "", impact = "") => {
  const p = (priority || impact || "").toLowerCase();
  if (p === "critical") return "critical";
  if (p === "high") return "high";
  if (p === "medium") return "medium";
  return "info";
};

const dotWeight = { critical: 4, high: 3, medium: 2, info: 1 };

export function buildProjectOverview(project, asOf = new Date()) {
  const tasks      = project.tasks      || [];
  const risks      = project.risks      || [];
  const milestones = project.milestones || [];
  const requests   = project.requests   || [];
  const activities = project.activities || [];

  const currentPhaseCost = (project.costs || []).find(
    (item) => (item.phase || "").toLowerCase() === (project.phase || "").toLowerCase()
  );
  const plannedCost  = Number(currentPhaseCost?.estimate || 0);
  const actualCost   = Number(currentPhaseCost?.actual   || 0);
  const costVariance = Number((plannedCost - actualCost).toFixed(1));

  const overdueTasks = tasks.filter((task) => {
    const due = dateValue(task.due_date || task.dueDate);
    return due && due < asOf && !isClosed(task.status);
  });

  const openRisks = risks.filter((risk) => !isClosed(risk.status));

  const currentMilestone =
    milestones
      .filter((m) => !isClosed(m.status))
      .sort(
        (a, b) =>
          (dateValue(a.forecastDate)?.getTime() || Infinity) -
          (dateValue(b.forecastDate)?.getTime() || Infinity)
      )[0] || null;

  const notifications = [
    // ── Open risks ───────────────────────────────────────────────
    ...openRisks.map((risk) => {
      const dotColor = dotColorForRisk(risk.priority, risk.impact);
      return {
        id: `risk-${risk.id}`,
        type: "Risk",
        title: risk.title || risk.description,
        owner: risk.owner || "Unassigned",
        due: risk.dueDate || risk.due || null,
        source: risk.category || null,
        dotColor,
        actionRequired: true,
        priority: dotColor === "critical" || dotColor === "high" ? 3 : 2,
      };
    }),

    // ── Overdue / blocked tasks ──────────────────────────────────
    ...tasks
      .filter(
        (t) =>
          overdueTasks.includes(t) ||
          (t.status || "").toLowerCase() === "blocked"
      )
      .map((task) => {
        const isOverdue = overdueTasks.includes(task);
        return {
          id: `task-${task.id}`,
          type: isOverdue ? "Overdue task" : "Blocked task",
          title: task.title,
          owner: task.owner || "Unassigned",
          due: task.due_date || task.dueDate || null,
          source: task.milestone || null,
          dotColor: "critical",
          actionRequired: true,
          priority: 3,
        };
      }),

    // ── Requests awaiting review (TQ + Change Orders) ────────────
    ...requests
      .filter((req) => {
        const s = (req.status || "").toLowerCase();
        return s.includes("review") || s === "open" || s === "pending";
      })
      .slice(0, 4)
      .map((req) => {
        const raw = (req.type || "").toLowerCase();
        const type = raw.includes("change") ? "Change Order" : "Technical Query";
        const needsReview = (req.status || "").toLowerCase().includes("review");
        return {
          id: `req-${req.id}`,
          type,
          title: req.title || req.description || req.summary,
          owner: req.submittedBy || req.owner || req.from || "Unassigned",
          due: req.received || req.date || req.created_at || null,
          source: req.discipline || req.category || null,
          dotColor: "high",
          actionRequired: needsReview,
          priority: 2,
        };
      }),

    // ── Activities needing review ────────────────────────────────
    ...activities
      .filter((a) => a.status === "Needs review")
      .slice(0, 3)
      .map((activity) => ({
        id: `activity-${activity.id}`,
        type: "Data update",
        title: activity.summary || activity.action || activity.title,
        owner: activity.from || activity.source || "System",
        due: activity.received || null,
        source: activity.type || null,
        dotColor: "info",
        actionRequired: true,
        priority: 2,
      })),

    // ── Recent completed activity (informational) ────────────────
    ...activities
      .filter((a) => a.status !== "Needs review")
      .slice(0, 1)
      .map((activity) => ({
        id: `activity-done-${activity.id}`,
        type: "Task update",
        title: activity.summary || activity.action || activity.title,
        owner: activity.from || activity.source || "System",
        due: activity.received || null,
        source: activity.type || null,
        dotColor: "info",
        actionRequired: false,
        priority: 1,
      })),
  ]
    .sort(
      (a, b) =>
        (dotWeight[b.dotColor] || 1) - (dotWeight[a.dotColor] || 1) ||
        b.priority - a.priority
    )
    .slice(0, 8);

  return {
    progress: Number(project.progress || 0),
    phase: project.phase || "Not set",
    costVariance,
    openRiskCount: openRisks.length,
    overdueCount: overdueTasks.length,
    currentMilestone,
    notifications,
    daysToMilestone: currentMilestone?.forecastDate
      ? Math.ceil((dateValue(currentMilestone.forecastDate) - asOf) / DAY)
      : null,
  };
}
