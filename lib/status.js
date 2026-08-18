import Compliance from "@/models/Compliance";

/**
 * Marks due-but-uncompleted compliance records as OVERDUE.
 * Called from the list API; a cron job can call this too.
 */
export async function refreshOverdueCompliance() {
  try {
    const now = new Date();
    await Compliance.updateMany(
      { status: { $ne: "COMPLETED" }, dueDate: { $lt: now } },
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
