import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { ok, fail, handleError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "30", 10), 1), 100);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ userId: user._id, isRead: false }),
    ]);

    return ok(notifications, "", { unreadCount });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const body = await request.json();

    if (body.markAll) {
      await Notification.updateMany({ userId: user._id }, { isRead: true });
      return ok(null, "All notifications marked as read.");
    }

    if (body.id) {
      const n = await Notification.findOneAndUpdate(
        { _id: body.id, userId: user._id },
        { isRead: true },
        { new: true }
      );
      if (!n) return fail("Notification not found.", 404);
      return ok(n, "Notification updated.");
    }

    return fail("Nothing to update.", 400);
  } catch (error) {
    return handleError(error);
  }
}
