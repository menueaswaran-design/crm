import dbConnect from "@/lib/mongodb";
import Compliance from "@/models/Compliance";
import Client from "@/models/Client";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { companyScope } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";
import { refreshOverdueCompliance, endOfDay } from "@/lib/status";
import { refreshComplianceReminders, ensureRecurringRollforward } from "@/lib/reminders";

const UNASSIGNED_QUERY = {
  $or: [{ assignedStaff: null }, { assignedStaff: { $exists: false } }],
};

export async function GET(request) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "compliance");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const assigned = searchParams.get("assigned") || "";
    const upcoming = searchParams.get("upcoming") === "1";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);

    await refreshOverdueCompliance();
    await refreshComplianceReminders();
    await ensureRecurringRollforward();

    const scope = companyScope(user) || {};
    const query = { ...scope };
    if (status && status !== "All") query.status = status;
    if (type && type !== "All Types") query.category = type;
    if (upcoming) {
      query.status = { $ne: "COMPLETED" };
      query.dueDate = { $gte: new Date(new Date().setHours(0, 0, 0, 0)) };
    }

    if (user.role === "staff") {
      query.assignedStaff = user._id;
    } else if (assigned === "unassigned") {
      Object.assign(query, UNASSIGNED_QUERY);
    } else if (assigned === "assigned") {
      query.assignedStaff = { $ne: null, $exists: true };
    }

    const [records, total] = await Promise.all([
      Compliance.find(query)
        .populate("clientId", "name category phone")
        .populate("assignedStaff", "name email")
        .sort({ dueDate: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Compliance.countDocuments(query),
    ]);

    return ok(records, "", {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "compliance");
    const body = await request.json();

    if (!body.clientId || !body.type || !body.dueDate) {
      return fail("Client, type and due date are required.");
    }

    const scope = companyScope(user) || {};
    const assignedStaff = body.assignedStaff || null;

    const client = await Client.findOne({ _id: body.clientId, isDeleted: { $ne: true }, ...scope }).lean();
    if (!client) return fail("Client not found.", 404);

    const dueDate = new Date(body.dueDate);
    const status = endOfDay(dueDate) < new Date() ? "OVERDUE" : "PENDING";

    const record = await Compliance.create({
      ...body,
      companyId: user.companyId,
      assignedStaff,
      dueDate,
      status,
      createdBy: user._id,
    });

    await logActivity({
      userId: user._id,
      companyId: user.companyId,
      action: "COMPLIANCE_CREATED",
      entityType: "Compliance",
      entityId: record._id,
      description: `${user.name} created ${record.type} for ${client.name}`,
    });

    if (assignedStaff) {
      await createNotification({
        userId: assignedStaff,
        type: "COMPLIANCE_DUE",
        title: "Compliance assigned",
        message: `${record.type} for ${client.name} is due on ${dueDate.toLocaleDateString("en-IN")}.`,
        entityType: "Compliance",
        entityId: record._id,
      });
    }

    return ok(record, "Compliance created successfully.");
  } catch (error) {
    return handleError(error);
  }
}
