import { ok, handleError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { getPracticeToday } from "@/lib/practiceToday";

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const data = await getPracticeToday(user);
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}
