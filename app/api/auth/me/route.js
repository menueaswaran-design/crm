import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

/**
 * Returns the currently authenticated user's profile.
 */
export async function GET(request) {
  try {
    await dbConnect();
    const user = await getCurrentUser(request);
    if (!user) return ok(null, "Not authenticated.");
    return ok(user);
  } catch {
    return ok(null, "Not authenticated.");
  }
}
