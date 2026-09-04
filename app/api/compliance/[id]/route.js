import dbConnect from "@/lib/mongodb";
import Compliance from "@/models/Compliance";
import Client from "@/models/Client";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { endOfDay } from "@/lib/status";
import { generateNextCompliance, refreshComplianceReminders } from "@/lib/reminders";

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "compliance");
    const { id } = await params;
    const body = await request.json();

    const record = await Compliance.findOne({ _id: id, companyId: user.companyId });
    if (!record) return fail("Compliance record not found.", 404);

    const client = await Client.findById(record.clientId).lean();
    let nextScheduled = null;

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
      if (record.status !== "COMPLETED" && endOfDay(record.dueDate) < new Date()) {
        record.status = "OVERDUE";
      }
    }

    await record.save();

    if (body.status === "COMPLETED") {
      await logActivity({
        userId: user._id,
        companyId: user.companyId,
        action: "COMPLIANCE_COMPLETED",
        entityType: "Compliance",
        entityId: record._id,
        description: `${user.name} completed ${record.type} for ${client?.name || "client"}`,
      });

      // Auto-create the NEXT occurrence for recurring filings (GST monthly, ITR annual, etc.)
      const nextRecord = await generateNextCompliance(record);
      nextScheduled = nextRecord ? nextRecord.dueDate : null;
    }

    await refreshComplianceReminders();

    return ok(
      { ...record.toJSON(), nextScheduled },
      nextScheduled
        ? "Marked complete. Next occurrence scheduled."
        : "Compliance updated successfully."
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "compliance");
    const { id } = await params;

    const record = await Compliance.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!record) return fail("Compliance record not found.", 404);

    await logActivity({
      userId: user._id,
      companyId: user.companyId,
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
