import { ok, handleError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { getRecentActivity } from "@/lib/dashboard";

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const data = await getRecentActivity(user);
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}
