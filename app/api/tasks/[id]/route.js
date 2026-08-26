import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "tasks");
    const { id } = await params;
    const body = await request.json();

    const task = await Task.findById(id);
    if (!task) return fail("Task not found.", 404);

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
