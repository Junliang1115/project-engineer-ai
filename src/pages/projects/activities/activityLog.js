const RANGE_DAYS = { "7days": 7, "30days": 30 };

export function filterActivitiesByDate(activities, range = "all", now = new Date()) {
  if (range === "all") return activities;

  const start = new Date(now);
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setTime(now.getTime() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000);
  }

  return activities.filter(({ received }) => {
    const date = new Date(received?.replace(" ", "T"));
    return !Number.isNaN(date.getTime()) && date >= start && date <= now;
  });
}
