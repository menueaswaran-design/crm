import { ok, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { getUpcomingDeadlines } from "@/lib/dashboard";
import { refreshOverdueCompliance } from "@/lib/status";
import { refreshComplianceReminders, ensureRecurringRollforward } from "@/lib/reminders";

export async function GET(request) {
  try {
    const user = await requirePermission(request, "dashboard");
    await refreshOverdueCompliance();
    await refreshComplianceReminders();
    await ensureRecurringRollforward();
    const data = await getUpcomingDeadlines(user);
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}
