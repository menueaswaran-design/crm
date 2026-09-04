import dbConnect from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { deriveInvoiceStatus } from "@/lib/invoice";
import { logActivity } from "@/lib/activity";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "invoices");
    const { id } = await params;
    const payments = await Payment.find({ invoiceId: id, companyId: user.companyId }).sort({ paymentDate: -1 }).lean();
    return ok(payments);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "invoices");
    const { id } = await params;
    const body = await request.json();

    const amount = Number(body.amount);
    if (!amount || amount <= 0) return fail("Payment amount must be positive.");
    if (!body.paymentDate) return fail("Payment date is required.");

    const invoice = await Invoice.findOne({ _id: id, isDeleted: { $ne: true }, companyId: user.companyId });
    if (!invoice) return fail("Invoice not found.", 404);

    const payment = await Payment.create({
      invoiceId: invoice._id,
      clientId: invoice.clientId,
      companyId: user.companyId,
      amount,
      paymentDate: new Date(body.paymentDate),
      paymentMethod: body.paymentMethod || "BANK",
      referenceNumber: body.referenceNumber || "",
      notes: body.notes || "",
      recordedBy: user._id,
    });

    // Recalculate totals from payment history (source of truth).
    const payments = await Payment.find({ invoiceId: invoice._id });
    const paidAmount = payments.reduce((s, p) => s + p.amount, 0);
    invoice.paidAmount = paidAmount;
    invoice.outstandingAmount = Math.max(0, invoice.totalAmount - paidAmount);
    invoice.status = deriveInvoiceStatus({
      totalAmount: invoice.totalAmount,
      paidAmount,
      dueDate: invoice.dueDate,
      status: invoice.status,
    });
    await invoice.save();

    await logActivity({
      userId: user._id,
      companyId: user.companyId,
      action: "PAYMENT_RECORDED",
      entityType: "Payment",
      entityId: payment._id,
      description: `${user.name} recorded a payment of ${amount} against ${invoice.invoiceNumber}`,
    });

    return ok({ payment, invoice }, "Payment recorded successfully.");
  } catch (error) {
    return handleError(error);
  }
}
