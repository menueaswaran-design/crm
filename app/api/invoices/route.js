import dbConnect from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import Client from "@/models/Client";
import { ok, fail, handleError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { nextInvoiceNumber } from "@/lib/counter";
import { calculateInvoice, deriveInvoiceStatus } from "@/lib/invoice";
import { logActivity } from "@/lib/activity";

export async function GET(request) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);

    const query = { isDeleted: { $ne: true } };
    if (status && status !== "All") query.status = status;

    if (user.role === "staff") {
      const clients = await Client.find({ assignedStaff: user._id }).select("_id").lean();
      query.clientId = { $in: clients.map((c) => c._id) };
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate("clientId", "name category")
        .sort({ invoiceDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    return ok(invoices, "", {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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

    if (!body.clientId || !body.invoiceDate || !body.dueDate || !Array.isArray(body.items) || !body.items.length) {
      return fail("Client, dates and at least one invoice item are required.");
    }

    const client = await Client.findOne({ _id: body.clientId, isDeleted: { $ne: true } }).lean();
    if (!client) return fail("Client not found.", 404);

    const invoiceNumber = await nextInvoiceNumber();
    const calc = calculateInvoice({ items: body.items, gstRate: body.gstRate });

    const invoice = await Invoice.create({
      invoiceNumber,
      clientId: body.clientId,
      invoiceDate: new Date(body.invoiceDate),
      dueDate: new Date(body.dueDate),
      items: body.items,
      notes: body.notes || "",
      createdBy: user._id,
      ...calc,
      paidAmount: 0,
      outstandingAmount: calc.totalAmount,
      status: "PENDING",
    });

    await logActivity({
      userId: user._id,
      action: "INVOICE_CREATED",
      entityType: "Invoice",
      entityId: invoice._id,
      description: `${user.name} created invoice ${invoiceNumber}`,
    });

    return ok(invoice, "Invoice created successfully.");
  } catch (error) {
    return handleError(error);
  }
}
