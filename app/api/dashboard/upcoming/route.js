import { ok, handleError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { getUpcomingDeadlines } from "@/lib/dashboard";

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const data = await getUpcomingDeadlines(user);
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}
