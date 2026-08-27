import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import Client from "@/models/Client";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";
import { sendTaskAssignedEmail } from "@/lib/taskEmails";

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "tasks");
    const { id } = await params;
    const body = await request.json();

    const task = await Task.findById(id);
    if (!task) return fail("Task not found.", 404);

    const previousAssignee = task.assignedTo ? String(task.assignedTo) : null;

    if (body.status !== undefined) {
      task.status = body.status;
      if (body.status === "IN_PROGRESS" && !task.startedAt) task.startedAt = new Date();
      if (body.status === "COMPLETED") task.completedAt = new Date();
    }

    const editable = ["title", "description", "clientId", "assignedTo", "priority", "dueDate"];
    for (const f of editable) {
      if (body[f] !== undefined) task[f] = body[f];
    }
    if (body.assignedTo === "" || body.assignedTo === null) {
      task.assignedTo = null;
    }
    if (body.dueDate) task.dueDate = new Date(body.dueDate);

    await task.save();

    // Assignment changed: notify + email the newly assigned staff member.
    const newAssignee = task.assignedTo ? String(task.assignedTo) : null;
    if (newAssignee && newAssignee !== previousAssignee) {
      await createNotification({
        userId: task.assignedTo,
        type: "TASK_ASSIGNED",
        title: "New task assigned",
        message: `Task "${task.title}" has been assigned to you.`,
        entityType: "Task",
        entityId: task._id,
      });

      const client = task.clientId
        ? await Client.findById(task.clientId).select("name").lean()
        : null;

      await sendTaskAssignedEmail({
        taskTitle: task.title,
        clientName: client?.name,
        dueDate: task.dueDate,
        priority: task.priority,
        assignedBy: user.name,
        assignedToId: task.assignedTo,
      });
    }

    if (body.status === "COMPLETED") {
      await logActivity({
        userId: user._id,
        action: "TASK_COMPLETED",
        entityType: "Task",
        entityId: task._id,
        description: `${user.name} completed task "${task.title}"`,
      });
    }

    return ok(task, "Task updated successfully.");
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "tasks");
    const { id } = await params;

    const task = await Task.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!task) return fail("Task not found.", 404);

    await logActivity({
      userId: user._id,
      action: "TASK_DELETED",
      entityType: "Task",
      entityId: id,
      description: `${user.name} deleted task "${task.title}"`,
    });

    return ok(null, "Task deleted successfully.");
  } catch (error) {
    return handleError(error);
  }
}
