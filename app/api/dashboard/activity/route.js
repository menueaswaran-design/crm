import { ok, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { getRecentActivity } from "@/lib/dashboard";

export async function GET(request) {
  try {
    const user = await requirePermission(request, "dashboard");
    const data = await getRecentActivity(user);
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}
