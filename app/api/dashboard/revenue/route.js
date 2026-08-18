import { ok, handleError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { getRevenueSeries, getRecentActivity, getUpcomingDeadlines } from "@/lib/dashboard";

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const data = await getRevenueSeries(user);
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}
