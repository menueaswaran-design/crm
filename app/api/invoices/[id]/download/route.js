import * as XLSX from "xlsx";
import dbConnect from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";
import { fail } from "@/lib/api";
import { requirePermission } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    await requirePermission(request, "invoices");
    const { id } = await params;

    const invoice = await Invoice.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("clientId", "name")
      .lean();
    if (!invoice) return fail("Invoice not found.", 404);

    const payments = await Payment.find({ invoiceId: id }).sort({ paymentDate: 1 }).lean();

    const items = (invoice.items || []).map((item, i) => ({
      "#": i + 1,
      Description: item.description || "",
      "Service Type": item.serviceType || "",
      "Quantity": Number(item.quantity) || 0,
      "Rate": Number(item.amount) || 0,
      "Amount": (Number(item.quantity) || 0) * (Number(item.amount) || 0),
    }));

    const summary = [
      { Field: "Invoice #", Value: invoice.invoiceNumber },
      { Field: "Client", Value: invoice.clientId?.name || "" },
      { Field: "Invoice Date", Value: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().slice(0, 10) : "" },
      { Field: "Subtotal", Value: invoice.subtotal ?? 0 },
      { Field: `GST (${invoice.gstRate || 0}%)`, Value: invoice.gstAmount ?? 0 },
      { Field: "Total", Value: invoice.totalAmount ?? 0 },
      { Field: "Paid", Value: invoice.paidAmount ?? 0 },
      { Field: "Outstanding", Value: invoice.outstandingAmount ?? 0 },
      { Field: "Status", Value: invoice.status || "" },
    ];

    const paymentRows = (payments || []).map((p, i) => ({
      "#": i + 1,
      "Payment Date": p.paymentDate?.toISOString?.().slice(0, 10) || "",
      "Amount": p.amount ?? 0,
      "Method": p.paymentMethod || "",
      "Reference": p.referenceNumber || "",
      "Notes": p.notes || "",
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(items), "Items");
    if (paymentRows.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentRows), "Payments");
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(invoice.invoiceNumber)}.xlsx"`,
      },
    });
  } catch (error) {
    return fail("Unable to download invoice.", 500);
  }
}
