import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import Client from "@/models/Client";
import { ok, fail, handleError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";
import { deriveTaskStatus } from "@/lib/status";

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
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const status = normalizeStatus(searchParams.get("status") || "");
    const priority = normalizePriority(searchParams.get("priority") || "");
    const assigned = searchParams.get("assigned") || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);

    const query = { isDeleted: { $ne: true } };
    if (priority) query.priority = priority;

    if (user.role === "staff") {
      query.assignedTo = user._id;
    } else if (assigned === "unassigned") {
      Object.assign(query, UNASSIGNED_QUERY);
    } else if (assigned === "assigned") {
      query.assignedTo = { $ne: null, $exists: true };
    }

    // Status OVERDUE is derived — fetch a wider set then filter.
    // For stored statuses, filter in Mongo when not overdue.
    const needsDerivedFilter = Boolean(status);
    const mongoQuery = { ...query };
    if (status && status !== "OVERDUE") {
      mongoQuery.status = status === "IN_PROGRESS" ? "IN_PROGRESS" : status;
      // PENDING list should not include completed; overdue derived from pending/in_progress
      if (status === "PENDING") mongoQuery.status = "PENDING";
    }

    const fetchLimit = needsDerivedFilter ? Math.min(limit * 5, 200) : limit;
    const fetchSkip = needsDerivedFilter ? 0 : (page - 1) * limit;

    const [tasks, totalRaw] = await Promise.all([
      Task.find(mongoQuery)
        .populate("clientId", "name")
        .populate("assignedTo", "name email role")
        .populate("createdBy", "name")
        .sort({ dueDate: 1, priority: -1 })
        .skip(fetchSkip)
        .limit(fetchLimit)
        .lean(),
      Task.countDocuments(mongoQuery),
    ]);

    let list = tasks.map((t) => ({ ...t, derivedStatus: deriveTaskStatus(t) }));

    if (status) {
      list = list.filter((t) => t.derivedStatus === status);
    }

    const total = status ? list.length : totalRaw;
    const paged = status
      ? list.slice((page - 1) * limit, page * limit)
      : list;

    return ok(paged, "", {
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
    const user = await requireAuth(request);
    const body = await request.json();

    if (!body.title || !body.description || !body.priority || !body.dueDate) {
      return fail("Title, description, priority and due date are required.");
    }

    const assignedTo = body.assignedTo || null;

    const client = body.clientId
      ? await Client.findOne({ _id: body.clientId, isDeleted: { $ne: true } }).lean()
      : null;
    if (body.clientId && !client) return fail("Client not found.", 404);

    const task = await Task.create({
      title: body.title,
      description: body.description,
      clientId: body.clientId || null,
      assignedTo,
      priority: body.priority,
      status: "PENDING",
      dueDate: new Date(body.dueDate),
      createdBy: user._id,
    });

    await logActivity({
      userId: user._id,
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
