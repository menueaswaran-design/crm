import Compliance from "@/models/Compliance";

/**
 * Start of today (00:00 local time) for safe date-only comparisons.
 */
export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * End of a given day (23:59:59.999 local time).
 * A filing entered for "today" stays PENDING for the whole day
 * instead of turning OVERDUE at midnight UTC.
 */
export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Marks due-but-uncompleted compliance records as OVERDUE.
 * Only flips records whose due date day has fully passed —
 * something due TODAY is still on time until the day ends.
 * Called from the list API; a cron job can call this too.
 *
 * Single-flight + cooldown: several endpoints trigger this on every page load,
 * so share one cheap run per window instead of re-scanning on each request.
 */
let inflightOverdue = null;
let lastOverdueAt = 0;

export function refreshOverdueCompliance() {
  if (inflightOverdue) return inflightOverdue;
  if (Date.now() - lastOverdueAt < 10_000) return Promise.resolve();
  inflightOverdue = _refreshOverdueCompliance()
    .catch((error) => console.error("refreshOverdueCompliance failed:", error.message))
    .finally(() => {
      lastOverdueAt = Date.now();
      inflightOverdue = null;
    });
  return inflightOverdue;
}

async function _refreshOverdueCompliance() {
  try {
    await Compliance.updateMany(
      { status: { $ne: "COMPLETED" }, dueDate: { $lt: startOfToday() } },
      { $set: { status: "OVERDUE" } }
    );
  } catch (error) {
    console.error("refreshOverdueCompliance failed:", error.message);
  }
}

/**
 * Marks overdue or due-soon tasks with derived status.
 * Tasks store PENDING/IN_PROGRESS/COMPLETED; overdue is derived at read time.
 */
export function deriveTaskStatus(task) {
  if (task.status === "COMPLETED") return "COMPLETED";
  if (task.dueDate && new Date(task.dueDate) < new Date()) return "OVERDUE";
  return task.status;
}
