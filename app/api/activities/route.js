import dbConnect from "@/lib/mongodb";
import Activity from "@/models/Activity";
import { ok, handleError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 100);
    const skip = Math.max(parseInt(searchParams.get("skip") || "0", 10), 0);

    const activities = await Activity.find({})
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return ok(activities);
  } catch (error) {
    return handleError(error);
  }
}
