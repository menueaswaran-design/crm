import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import User from "@/models/User";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "tasks");
    const { id } = await params;
    const body = await request.json();

    const task = await Task.findOne({ _id: id, companyId: user.companyId });
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
    // Reassigned staff must belong to the same tenant.
    if (task.assignedTo) {
      const staff = await User.findOne({ _id: task.assignedTo, isActive: true, companyId: user.companyId }).select("_id").lean();
      if (!staff) return fail("Assigned staff member not found in your company.", 404);
      task.assignedTo = staff._id;
    }
    if (body.dueDate) task.dueDate = new Date(body.dueDate);

    await task.save();

    if (body.status === "COMPLETED") {
      await logActivity({
        userId: user._id,
        companyId: user.companyId,
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

    const task = await Task.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { isDeleted: true },
      { new: true }
    );
    if (!task) return fail("Task not found.", 404);

    await logActivity({
      userId: user._id,
      companyId: user.companyId,
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
