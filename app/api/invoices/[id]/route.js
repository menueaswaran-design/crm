import dbConnect from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { calculateInvoice, deriveInvoiceStatus } from "@/lib/invoice";
import { logActivity } from "@/lib/activity";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "invoices");
    const { id } = await params;

    const invoice = await Invoice.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("clientId", "name category pan gstin email phone address")
      .lean();
    if (!invoice) return fail("Invoice not found.", 404);

    const payments = await Payment.find({ invoiceId: id }).sort({ paymentDate: -1 }).lean();

    return ok({ ...invoice, payments });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "invoices");
    const { id } = await params;
    const body = await request.json();

    const invoice = await Invoice.findById(id);
    if (!invoice) return fail("Invoice not found.", 404);

    if (body.items) {
      const calc = calculateInvoice({ items: body.items, gstRate: body.gstRate ?? invoice.gstRate });
      invoice.items = body.items;
      invoice.subtotal = calc.subtotal;
      invoice.gstRate = calc.gstRate;
      invoice.gstAmount = calc.gstAmount;
      invoice.totalAmount = calc.totalAmount;
    }

    const editable = ["invoiceDate", "dueDate", "notes", "status"];
    for (const f of editable) {
      if (body[f] !== undefined) invoice[f] = body[f];
    }

    invoice.status = deriveInvoiceStatus({
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      dueDate: invoice.dueDate,
      status: invoice.status,
    });

    await invoice.save();
    return ok(invoice, "Invoice updated successfully.");
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "invoices");
    const { id } = await params;

    const invoice = await Invoice.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!invoice) return fail("Invoice not found.", 404);

    await logActivity({
      userId: user._id,
      action: "INVOICE_DELETED",
      entityType: "Invoice",
      entityId: id,
      description: `${user.name} deleted invoice ${invoice.invoiceNumber}`,
    });

    return ok(null, "Invoice deleted successfully.");
  } catch (error) {
    return handleError(error);
  }
}
