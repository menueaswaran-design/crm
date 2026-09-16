import dbConnect from "@/lib/mongodb";
import LoginHistory from "@/models/LoginHistory";
import { ok, handleError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

export async function GET(request) {
  try {
    await dbConnect();
    const user = await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);

    const query = { companyId: user.companyId };

    if (date) {
      const day = new Date(`${date}T00:00:00`);
      if (!Number.isNaN(day.getTime())) {
        const end = new Date(day.getTime() + 24 * 60 * 60 * 1000);
        query.timestamp = { $gte: day, $lt: end };
      }
    } else if (from || to) {
      const range = {};
      if (from) {
        const fromDay = new Date(`${from}T00:00:00`);
        if (!Number.isNaN(fromDay.getTime())) range.$gte = fromDay;
      }
      if (to) {
        const toDay = new Date(`${to}T00:00:00`);
        if (!Number.isNaN(toDay.getTime())) range.$lt = new Date(toDay.getTime() + 24 * 60 * 60 * 1000);
      }
      if (Object.keys(range).length) query.timestamp = range;
    }

    const [records, total] = await Promise.all([
      LoginHistory.find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LoginHistory.countDocuments(query),
    ]);

    return ok(records, "", {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return handleError(error);
  }
}