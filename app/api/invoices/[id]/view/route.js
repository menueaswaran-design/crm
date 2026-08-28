import dbConnect from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import Client from "@/models/Client";
import User from "@/models/User";
import { fail } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { formatINR } from "@/lib/utils";

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "invoices");
    const { id } = await params;

    const invoice = await Invoice.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("clientId", "name category pan gstin email phone address")
      .lean();
    if (!invoice) return fail("Invoice not found.", 404);

    const client = invoice.clientId || {};
    const createdBy = invoice.createdBy ? await User.findById(invoice.createdBy).lean() : null;

    const itemRows = (invoice.items || [])
      .map(
        (item, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(item.description)}${item.serviceType ? `<div class="sub">${esc(item.serviceType)}</div>` : ""}</td>
            <td class="num">${Number(item.quantity) || 0}</td>
            <td class="num">${formatINR(item.amount)}</td>
            <td class="num">${formatINR((Number(item.quantity) || 0) * (Number(item.amount) || 0))}</td>
          </tr>`
      )
      .join("");

    const state = String(invoice.status || "PENDING").toLowerCase();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(invoice.invoiceNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; background: #f1f5f9; }
  .wrapper { max-width: 820px; margin: 0 auto; padding: 32px 16px 64px; }
  .toolbar { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 20px; }
  .toolbar button, .toolbar a {
    display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; font-size: 14px;
    font-weight: 600; border-radius: 10px; border: none; cursor: pointer; text-decoration: none;
  }
  .toolbar .print { background: #0f766e; color: #fff; }
  .toolbar .download { background: #fff; color: #0f172a; border: 1px solid #e2e8f0; }
  .sheet { background: #fff; border-radius: 16px; box-shadow: 0 10px 30px rgba(15,23,42,.08); overflow: hidden; }
  .sheet-inner { padding: 40px; }
  .head { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #0f766e; padding-bottom: 24px; }
  .brand h1 { margin: 0; font-size: 26px; letter-spacing: .5px; color: #0f172a; }
  .brand p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
  .doc-title { text-align: right; }
  .doc-title h2 { margin: 0; font-size: 22px; color: #0f766e; text-transform: uppercase; letter-spacing: 1px; }
  .doc-title .no { font-size: 14px; color: #334155; margin-top: 4px; font-weight: 600; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; padding: 28px 0; }
  .meta h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; }
  .meta p { margin: 2px 0; font-size: 14px; color: #1e293b; }
  .meta .muted { color: #64748b; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  thead th { text-align: left; padding: 10px 12px; background: #f8fafc; color: #475569; font-size: 11px;
    text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; }
  thead th.num, td.num { text-align: right; }
  tbody td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
  tbody td .sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }
  .totals { margin-left: auto; width: 300px; padding-top: 20px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 12px; font-size: 14px; color: #475569; }
  .totals .row.grand { font-weight: 700; color: #0f172a; font-size: 16px; border-top: 2px solid #0f766e; margin-top: 6px; padding-top: 10px; }
  .totals .row.paid { color: #059669; font-weight: 600; }
  .totals .row.outstanding { color: #dc2626; font-weight: 600; }
  .notes { margin-top: 28px; padding: 16px 20px; background: #f8fafc; border-radius: 12px; }
  .notes h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; }
  .notes p { margin: 0; font-size: 14px; color: #334155; white-space: pre-wrap; }
  .foot { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; }
  .status { display: inline-block; padding: 4px 14px; border-radius: 999px; font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .5px; margin-top: 8px; }
  .status.${state} { background: ${state === "paid" ? "#d1fae5" : state === "overdue" ? "#fee2e2" : state === "partial" ? "#e0f2fe" : "#fef3c7"};
    color: ${state === "paid" ? "#047857" : state === "overdue" ? "#b91c1c" : state === "partial" ? "#0369a1" : "#b45309"}; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .wrapper { padding: 0; }
    .sheet { box-shadow: none; border-radius: 0; }
  }
</style>
</head>
<body>
<div class="wrapper">
  <div class="toolbar">
    <a class="download" href="/api/invoices/${invoice._id}/download" download>⬇ Download</a>
    <button class="print" onclick="window.print()">🖨 Print / Save PDF</button>
  </div>
  <div class="sheet">
    <div class="sheet-inner">
      <div class="head">
        <div class="brand">
          <h1>TaxCraft</h1>
          <p>Accounting &amp; Taxation Services</p>
        </div>
        <div class="doc-title">
          <h2>Tax Invoice</h2>
          <div class="no">${esc(invoice.invoiceNumber)}</div>
          <span class="status ${state}">${esc(String(invoice.status || "PENDING").replace(/_/g, " "))}</span>
        </div>
      </div>

      <div class="meta">
        <div>
          <h4>Billed To</h4>
          <p>${esc(client.name || "—")}</p>
          ${client.category ? `<p class="muted">Category: ${esc(client.category)}</p>` : ""}
          ${client.pan ? `<p class="muted">PAN: ${esc(client.pan)}</p>` : ""}
          ${client.gstin ? `<p class="muted">GSTIN: ${esc(client.gstin)}</p>` : ""}
          ${client.phone ? `<p class="muted">${esc(client.phone)}</p>` : ""}
          ${client.email ? `<p class="muted">${esc(client.email)}</p>` : ""}
          ${client.address ? `<p class="muted">${esc(client.address)}</p>` : ""}
        </div>
        <div>
          <h4>Invoice Details</h4>
          <p><strong>Date:</strong> ${fmtDate(invoice.invoiceDate)}</p>
          <p><strong>Due Date:</strong> ${fmtDate(invoice.dueDate)}</p>
          <p><strong>Created by:</strong> ${esc(createdBy?.name || "—")}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:36px">#</th>
            <th>Description</th>
            <th class="num" style="width:80px">Qty</th>
            <th class="num" style="width:120px">Rate</th>
            <th class="num" style="width:130px">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows || `<tr><td colspan="5" style="color:#94a3b8;text-align:center">No items</td></tr>`}
        </tbody>
      </table>

      <div class="totals">
        <div class="row"><span>Subtotal</span><span>${formatINR(invoice.subtotal)}</span></div>
        <div class="row"><span>GST (${Number(invoice.gstRate) || 0}%)</span><span>${formatINR(invoice.gstAmount)}</span></div>
        <div class="row grand"><span>Total</span><span>${formatINR(invoice.totalAmount)}</span></div>
        <div class="row paid"><span>Paid</span><span>${formatINR(invoice.paidAmount)}</span></div>
        <div class="row outstanding"><span>Outstanding</span><span>${formatINR(invoice.outstandingAmount)}</span></div>
      </div>

      ${invoice.notes ? `<div class="notes"><h4>Notes</h4><p>${esc(invoice.notes)}</p></div>` : ""}

      <div class="foot">Generated on ${fmtDate(new Date())} &middot; Thank you for your business.</div>
    </div>
  </div>
</div>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    return fail("Unable to view invoice.", 500);
  }
}
