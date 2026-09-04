import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import Client from "@/models/Client";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { companyScope } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";
import { deriveTaskStatus, buildTaskStatusFilter } from "@/lib/status";

const STATUS_MAP = {
  pending: "PENDING",
  "in progress": "IN_PROGRESS",
  in_progress: "IN_PROGRESS",
  completed: "COMPLETED",
  overdue: "OVERDUE",
};

const PRIORITY_MAP = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
};

function normalizeStatus(value) {
  if (!value || value === "All Status") return "";
  return STATUS_MAP[String(value).trim().toLowerCase()] || String(value).toUpperCase();
}

function normalizePriority(value) {
  if (!value || value === "All Priority") return "";
  return PRIORITY_MAP[String(value).trim().toLowerCase()] || String(value).toUpperCase();
}

const UNASSIGNED_QUERY = {
  $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
};

export async function GET(request) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "tasks");

    const { searchParams } = new URL(request.url);
    const status = normalizeStatus(searchParams.get("status") || "");
    const priority = normalizePriority(searchParams.get("priority") || "");
    const assigned = searchParams.get("assigned") || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);

    const scope = companyScope(user) || {};
    const query = { isDeleted: { $ne: true }, ...scope };
    if (priority) query.priority = priority;

    if (user.role === "staff") {
      query.assignedTo = user._id;
    } else if (assigned === "unassigned") {
      Object.assign(query, UNASSIGNED_QUERY);
    } else if (assigned === "assigned") {
      query.assignedTo = { $ne: null, $exists: true };
    }

    if (status) {
      Object.assign(query, buildTaskStatusFilter(status));
    }

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate("clientId", "name phone")
        .populate("assignedTo", "name email role")
        .populate("createdBy", "name")
        .sort({ dueDate: 1, priority: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Task.countDocuments(query),
    ]);

    const list = tasks.map((t) => ({ ...t, derivedStatus: deriveTaskStatus(t) }));

    return ok(list, "", {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "tasks");
    const body = await request.json();

    if (!body.title || !body.description || !body.priority || !body.dueDate) {
      return fail("Title, description, priority and due date are required.");
    }

    const scope = companyScope(user) || {};
    const assignedTo = body.assignedTo || null;

    const client = body.clientId
      ? await Client.findOne({ _id: body.clientId, isDeleted: { $ne: true }, ...scope }).lean()
      : null;
    if (body.clientId && !client) return fail("Client not found.", 404);

    const task = await Task.create({
      title: body.title,
      description: body.description,
      companyId: user.companyId,
      clientId: body.clientId || null,
      assignedTo,
      priority: body.priority,
      status: "PENDING",
      dueDate: new Date(body.dueDate),
      createdBy: user._id,
    });

    await logActivity({
      userId: user._id,
      companyId: user.companyId,
      action: "TASK_CREATED",
      entityType: "Task",
      entityId: task._id,
      description: `${user.name} created task "${task.title}"`,
    });

    if (assignedTo) {
      await createNotification({
        userId: assignedTo,
        type: "TASK_ASSIGNED",
        title: "New task assigned",
        message: `Task "${task.title}" has been assigned to you.`,
        entityType: "Task",
        entityId: task._id,
      });
    }

    return ok(task, "Task created successfully.");
  } catch (error) {
    return handleError(error);
  }
}
