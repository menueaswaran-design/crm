import dbConnect from "@/lib/mongodb";
import Client from "@/models/Client";
import Compliance from "@/models/Compliance";
import Task from "@/models/Task";
import Document from "@/models/Document";
import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";
import Activity from "@/models/Activity";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission, requireAdmin, companyScope } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const RELATED_LIMIT = 20;

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "clients");
    const { id } = await params;
    const scope = companyScope(user) || {};

    const client = await Client.findOne({ _id: id, isDeleted: { $ne: true }, ...scope })
      .populate("assignedStaff", "name email role")
      .lean();

    if (!client) return fail("Client not found.", 404);
    if (user.role === "staff" && String(client.assignedStaff?._id || client.assignedStaff) !== String(user._id)) {
      return fail("You do not have access to this client.", 403);
    }

    const [
      compliance,
      complianceTotal,
      tasks,
      tasksTotal,
      documents,
      documentsTotal,
      invoices,
      invoicesTotal,
      activities,
    ] = await Promise.all([
      Compliance.find({ clientId: id, companyId: user.companyId }).sort({ dueDate: 1 }).limit(RELATED_LIMIT).lean(),
      Compliance.countDocuments({ clientId: id, companyId: user.companyId }),
      Task.find({ clientId: id, companyId: user.companyId, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(RELATED_LIMIT).lean(),
      Task.countDocuments({ clientId: id, companyId: user.companyId, isDeleted: { $ne: true } }),
      Document.find({ clientId: id, companyId: user.companyId, isDeleted: { $ne: true } }).sort({ uploadedAt: -1 }).limit(RELATED_LIMIT).lean(),
      Document.countDocuments({ clientId: id, companyId: user.companyId, isDeleted: { $ne: true } }),
      Invoice.find({ clientId: id, companyId: user.companyId, isDeleted: { $ne: true } }).sort({ invoiceDate: -1 }).limit(RELATED_LIMIT).lean(),
      Invoice.countDocuments({ clientId: id, companyId: user.companyId, isDeleted: { $ne: true } }),
      Activity.find({ entityId: id, companyId: user.companyId }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    return ok({
      client,
      compliance,
      tasks,
      documents,
      invoices,
      activities,
      counts: {
        compliance: complianceTotal,
        tasks: tasksTotal,
        documents: documentsTotal,
        invoices: invoicesTotal,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "clients");
    const { id } = await params;
    const scope = companyScope(user) || {};
    const body = await request.json();

    const client = await Client.findOne({ _id: id, isDeleted: { $ne: true }, ...scope });
    if (!client) return fail("Client not found.", 404);

    const pan = (body.pan || client.pan || "").toUpperCase();
    const gstin = (body.gstin || client.gstin || "").toUpperCase();

    const dupPan = await Client.findOne({ pan, _id: { $ne: id }, isDeleted: { $ne: true }, ...scope }).lean();
    if (dupPan) return fail("A client with this PAN already exists.", 409);
    if (gstin) {
      const dupGstin = await Client.findOne({ gstin, _id: { $ne: id }, isDeleted: { $ne: true }, ...scope }).lean();
      if (dupGstin) return fail("A client with this GSTIN already exists.", 409);
    }

    const fields = [
      "name", "category", "aadhaar", "cin", "email", "phone", "address",
      "assignedStaff", "status",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) client[f] = body[f];
    }
    if (body.assignedStaff === "" || body.assignedStaff === null) {
      client.assignedStaff = null;
    }
    client.pan = pan;
    client.gstin = gstin;
    await client.save();

    await logActivity({
      userId: user._id,
      companyId: user.companyId,
      action: "CLIENT_UPDATED",
      entityType: "Client",
      entityId: client._id,
      description: `${user.name} updated ${client.name}`,
    });

    return ok(client, "Client updated successfully.");
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const user = await requireAdmin(request);
    const { id } = await params;

    const client = await Client.findOne({ _id: id, companyId: user.companyId });
    if (!client) return fail("Client not found.", 404);

    client.isDeleted = true;
    client.deletedAt = new Date();
    client.deletedBy = user._id;
    await client.save();

    return ok(null, "Client deleted successfully.");
  } catch (error) {
    return handleError(error);
  }
}
