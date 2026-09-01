"use client";

import { Eye, Download, Trash2, Banknote, ReceiptText } from "lucide-react";
import { StatusBadge } from "@/components/common/Badge";
import Button from "@/components/common/Button";
import WhatsAppButton from "@/components/whatsapp/WhatsAppButton";
import { formatINR, formatDate, daysRemaining } from "@/lib/utils";
import { generatePaymentReminderMessage } from "@/lib/whatsappMessages";

const STATUS_TILE = {
  PAID: "bg-emerald-500",
  PARTIAL: "bg-sky-500",
  PENDING: "bg-amber-500",
  OVERDUE: "bg-rose-500",
};

export default function InvoiceCards({ invoices, onPayment, onDelete }) {
  return (
    <div className="flex flex-col gap-3">
      {invoices.map((inv) => {
        const status = String(inv.status || "PENDING").toUpperCase();
        const remaining = daysRemaining(inv.dueDate);
        const tile = STATUS_TILE[status] || STATUS_TILE.PENDING;
        return (
          <div key={inv._id} className="card card-hover flex items-center gap-4 p-4 animate-fade-in-up overflow-hidden relative">
            <span className={`shrink-0 h-10 w-1 rounded-full ${tile}`} />
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700 shrink-0">
              <ReceiptText size={18} />
            </span>

            <div className="min-w-0 flex-1 grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_0.9fr_0.9fr] gap-x-6 gap-y-1 items-center">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">{inv.invoiceNumber}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{inv.clientId?.name || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Amount</p>
                <p className="font-bold text-slate-900 text-sm">{formatINR(inv.totalAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Paid</p>
                <p className="font-medium text-emerald-600 text-sm">{formatINR(inv.paidAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Due Date</p>
                <p className="font-medium text-slate-700 text-sm">
                  {formatDate(inv.dueDate)}
                  {inv.outstandingAmount > 0 && remaining !== null && remaining <= 3 && (
                    <span className={`ml-1.5 text-[10px] font-semibold ${remaining < 0 ? "text-rose-500" : "text-amber-500"}`}>
                      {remaining < 0 ? `${Math.abs(remaining)}d overdue` : `${remaining}d left`}
                    </span>
                  )}
                </p>
              </div>
              <div className="hidden md:block">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Outstanding</p>
                <p className="font-medium text-slate-700 text-sm">{formatINR(inv.outstandingAmount)}</p>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-3 shrink-0">
              <StatusBadge status={inv.status} />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {inv.outstandingAmount > 0 && (
                <Button size="sm" variant="secondary" className="hidden sm:inline-flex" onClick={() => onPayment(inv)}>
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
                  className="hidden sm:inline-flex"
                />
              )}
              <button
                onClick={() => window.open(`/api/invoices/${inv._id}/view`, "_blank")}
                className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                aria-label="View invoice"
                title="View invoice"
              >
                <Eye size={15} />
              </button>
              <a
                href={`/api/invoices/${inv._id}/download`}
                download
                className="shrink-0 inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                aria-label="Download invoice Excel"
                title="Download Excel"
              >
                <Download size={15} />
              </a>
              {onDelete && (
                <button
                  onClick={() => onDelete(inv)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  aria-label="Delete invoice"
                  title="Delete invoice"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
