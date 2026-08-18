import dbConnect from "@/lib/mongodb";
import Compliance from "@/models/Compliance";
import Client from "@/models/Client";
import { ok, fail, handleError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    const record = await Compliance.findById(id);
    if (!record) return fail("Compliance record not found.", 404);

    const client = await Client.findById(record.clientId).lean();

    if (body.status !== undefined) {
      record.status = body.status;
      if (body.status === "COMPLETED") {
        record.completedAt = new Date();
        record.completedBy = user._id;
      } else {
        record.completedAt = null;
        record.completedBy = null;
      }
    }
    const editable = ["type", "category", "period", "financialYear", "dueDate", "assignedStaff", "priority", "description"];
    for (const f of editable) {
      if (body[f] !== undefined) record[f] = body[f];
    }
    if (body.assignedStaff === "" || body.assignedStaff === null) {
      record.assignedStaff = null;
    }
    if (body.dueDate) {
      record.dueDate = new Date(body.dueDate);
      if (record.status !== "COMPLETED" && record.dueDate < new Date()) {
        record.status = "OVERDUE";
      }
    }

    await record.save();

    if (body.status === "COMPLETED") {
      await logActivity({
        userId: user._id,
        action: "COMPLIANCE_COMPLETED",
        entityType: "Compliance",
        entityId: record._id,
        description: `${user.name} completed ${record.type} for ${client?.name || "client"}`,
      });
    }

    return ok(record, "Compliance updated successfully.");
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const { id } = await params;

    const record = await Compliance.findByIdAndDelete(id);
    if (!record) return fail("Compliance record not found.", 404);

    await logActivity({
      userId: user._id,
      action: "COMPLIANCE_DELETED",
      entityType: "Compliance",
      entityId: id,
      description: `${user.name} deleted compliance ${record.type}`,
    });

    return ok(null, "Compliance deleted successfully.");
  } catch (error) {
    return handleError(error);
  }
}
