import { ok, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/dashboard";

export async function GET(request) {
  try {
    const user = await requirePermission(request, "dashboard");
    const summary = await getDashboardSummary(user);
    return ok(summary);
  } catch (error) {
    return handleError(error);
  }
}
