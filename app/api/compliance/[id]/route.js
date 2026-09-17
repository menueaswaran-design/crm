import dbConnect from "@/lib/mongodb";
import Compliance from "@/models/Compliance";
import Client from "@/models/Client";
import User from "@/models/User";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { endOfDay } from "@/lib/status";
import { generateNextCompliance, refreshComplianceReminders } from "@/lib/reminders";
import { buildDocumentChecklist } from "@/lib/documentChecklists";

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
    if (body.assignedStaff) {
      const staff = await User.findOne({ _id: body.assignedStaff, isActive: true, companyId: user.companyId }).select("_id").lean();
      if (!staff) return fail("Assigned staff member not found in your company.", 404);
      record.assignedStaff = staff._id;
    }
    if (body.dueDate) {
      record.dueDate = new Date(body.dueDate);
      if (record.status !== "COMPLETED" && endOfDay(record.dueDate) < new Date()) {
        record.status = "OVERDUE";
      }
    }

    // Toggle or set a checklist item: { checklistKey, received: true|false }
    if (body.checklistKey) {
      if (!record.documentChecklist?.length) {
        record.documentChecklist = buildDocumentChecklist({
          type: record.type,
          category: record.category,
        });
      }
      const item = record.documentChecklist.find(
        (d) => d.key === body.checklistKey || d.name === body.checklistKey
      );
      if (!item) return fail("Checklist item not found.", 404);
      const received = body.received !== false;
      item.received = received;
      item.receivedAt = received ? new Date() : null;
      record.markModified("documentChecklist");
    }

    // Seed empty checklist for older records
    let seededChecklist = null;
    if (body.seedChecklist && !record.documentChecklist?.length) {
      seededChecklist = buildDocumentChecklist({
        type: record.type,
        category: record.category,
      });
      record.documentChecklist = seededChecklist;
      record.markModified("documentChecklist");
    }

    await record.save();

    // Belt-and-suspenders: persist via $set so HMR/stale schema cannot drop the field
    if (seededChecklist) {
      await Compliance.updateOne(
        { _id: record._id },
        { $set: { documentChecklist: seededChecklist } }
      );
      record.documentChecklist = seededChecklist;
    }

    if (body.status === "COMPLETED") {
      await logActivity({
        userId: user._id,
        companyId: user.companyId,
        action: "COMPLIANCE_COMPLETED",
        entityType: "Compliance",
        entityId: record._id,
        description: `${user.name} completed ${record.type} for ${client?.name || "client"}`,
      });

      const nextRecord = await generateNextCompliance(record);
      nextScheduled = nextRecord ? nextRecord.dueDate : null;
    }

    // Avoid running heavy reminder jobs for lightweight checklist toggles/seeds
    if (body.status !== undefined) {
      await refreshComplianceReminders();
    }

    const checklistOut = (seededChecklist || record.documentChecklist || []).map((d) => ({
      key: d.key,
      name: d.name,
      received: !!d.received,
      receivedAt: d.receivedAt || null,
    }));

    return ok(
      {
        _id: record._id,
        status: record.status,
        documentChecklist: checklistOut,
        nextScheduled,
      },
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
