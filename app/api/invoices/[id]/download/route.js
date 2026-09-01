import * as XLSX from "xlsx";
import dbConnect from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";
import { fail } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { formatDate, formatINR, roundMoney } from "@/lib/utils";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    await requirePermission(request, "invoices");
    const { id } = await params;

    const invoice = await Invoice.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("clientId", "name pan gstin")
      .lean();
    if (!invoice) return fail("Invoice not found.", 404);

    const payments = await Payment.find({ invoiceId: id }).sort({ paymentDate: 1 }).lean();

    const items = (invoice.items || []).map((item, i) => {
      const qty = Number(item.quantity) || 0;
      const rate = roundMoney(item.amount);
      return {
        "#": i + 1,
        Description: item.description || "",
        "Service Type": item.serviceType || "",
        Quantity: qty,
        "Rate (INR)": rate,
        "Amount (INR)": roundMoney(qty * rate),
      };
    });

    const summary = [
      { Field: "Invoice #", Value: invoice.invoiceNumber },
      { Field: "Client", Value: invoice.clientId?.name || "" },
      { Field: "PAN", Value: invoice.clientId?.pan || "" },
      { Field: "GSTIN", Value: invoice.clientId?.gstin || "" },
      { Field: "Invoice Date", Value: formatDate(invoice.invoiceDate) },
      { Field: "Due Date", Value: formatDate(invoice.dueDate) },
      { Field: "Subtotal", Value: formatINR(invoice.subtotal) },
      { Field: `GST (${Number(invoice.gstRate) || 0}%)`, Value: formatINR(invoice.gstAmount) },
      { Field: "Total", Value: formatINR(invoice.totalAmount) },
      { Field: "Paid", Value: formatINR(invoice.paidAmount) },
      { Field: "Outstanding", Value: formatINR(invoice.outstandingAmount) },
      { Field: "Status", Value: invoice.status || "" },
    ];

    const paymentRows = (payments || []).map((p, i) => ({
      "#": i + 1,
      "Payment Date": formatDate(p.paymentDate),
      "Amount (INR)": roundMoney(p.amount),
      Method: p.paymentMethod || "",
      Reference: p.referenceNumber || "",
      Notes: p.notes || "",
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(items), "Items");
    if (paymentRows.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentRows), "Payments");
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const safeName = String(invoice.invoiceNumber || "invoice").replace(/[^\w.-]+/g, "_");

    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeName)}.xlsx"`,
      },
    });
  } catch (error) {
    return fail("Unable to download invoice.", 500);
  }
}
