"use client";

import { Banknote, Trash2, FileDown, Eye, Download } from "lucide-react";
import { StatusBadge } from "@/components/common/Badge";
import Button from "@/components/common/Button";
import WhatsAppButton from "@/components/whatsapp/WhatsAppButton";
import { formatINR, formatDate } from "@/lib/utils";
import { generatePaymentReminderMessage } from "@/lib/whatsappMessages";

export default function InvoiceTable({ invoices, onPayment, onDelete }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/60">
              <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Invoice #</th>
              <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Client</th>
              <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Date</th>
              <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Due Date</th>
              <th className="px-5 py-3.5 font-semibold uppercase tracking-wide text-right">Amount</th>
              <th className="px-5 py-3.5 font-semibold uppercase tracking-wide text-right">Paid</th>
              <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Status</th>
              <th className="px-5 py-3.5 font-semibold uppercase tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <tr key={inv._id} className="hover:bg-brand-50/30 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                      <FileDown size={13} />
                    </span>
                    <span className="font-semibold text-slate-900">{inv.invoiceNumber}</span>
                  </div>
                </td>
                <td className="px-5 py-4 font-medium text-slate-700">{inv.clientId?.name || "—"}</td>
                <td className="px-5 py-4 text-slate-500">{formatDate(inv.invoiceDate)}</td>
                <td className="px-5 py-4 text-slate-500">{formatDate(inv.dueDate)}</td>
                <td className="px-5 py-4 text-right font-semibold text-slate-900">{formatINR(inv.totalAmount)}</td>
                <td className="px-5 py-4 text-right text-emerald-600 font-medium">{formatINR(inv.paidAmount)}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-1">
                    {inv.outstandingAmount > 0 && (
                      <Button size="sm" variant="secondary" onClick={() => onPayment(inv)}>
                        <Banknote size={13} /> Payment
                      </Button>
                    )}
                    {inv.outstandingAmount > 0 && inv.clientId?.phone && (
                      <WhatsAppButton
                        phone={inv.clientId.phone}
                        client={inv.clientId}
                        clientId={inv.clientId._id}
                        message={generatePaymentReminderMessage({ client: inv.clientId, invoice: inv })}
                        label="Payment reminder"
                        messageType="PAYMENT_REMINDER"
                        iconOnly
                      />
                    )}
                    <button
                      onClick={() => window.open(`/api/invoices/${inv._id}/view`, "_blank")}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      aria-label="View invoice"
                      title="View invoice"
                    >
                      <Eye size={14} />
                    </button>
                    <a
                      href={`/api/invoices/${inv._id}/download`}
                      download
                      className="inline-flex p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      aria-label="Download invoice Excel"
                      title="Download Excel"
                    >
                      <Download size={14} />
                    </a>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(inv)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        aria-label="Delete invoice"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
