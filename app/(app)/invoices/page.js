"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
import { getList, deleteData, buildQuery } from "@/lib/client";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import PaymentModal from "@/components/invoices/PaymentModal";
import InvoiceSummaryCards from "@/components/invoices/InvoiceSummaryCards";
import Pagination from "@/components/common/Pagination";
import EmptyState from "@/components/common/EmptyState";
import { SkeletonRows } from "@/components/common/Loading";
import Button from "@/components/common/Button";
import ConfirmDialog from "@/components/common/ConfirmDialog";

const STATUSES = ["All", "PENDING", "PARTIAL", "PAID", "OVERDUE"];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState(null);
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, pagination } = await getList(
        `/api/invoices${buildQuery({ status, page, limit: 15 })}`
      );
      setInvoices(data);
      setTotalPages(pagination.totalPages || 1);
      setTotal(pagination.total || 0);

      // Totals across the full dataset come from the dashboard summary.
      const s = await fetch("/api/dashboard/summary").then((r) => r.json());
      setTotals(
        s.data
          ? {
              totalRevenue: s.data.totalRevenue,
              amountReceived: s.data.amountReceived,
              outstanding: s.data.outstandingAmount,
            }
          : null
      );
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = () => {
    setFormOpen(false);
    setEditing(null);
    load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteData(`/api/invoices/${deleting._id}`);
      setDeleting(null);
      load();
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">Billing and payments</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus size={15} /> Create Invoice
        </Button>
      </div>

      <InvoiceSummaryCards totals={totals} loading={loading && !totals} />

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 px-3.5 py-2 text-sm font-semibold">
          <ReceiptText size={16} /> {status === "All" ? "All invoices" : status.charAt(0) + status.slice(1).toLowerCase()}
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all ${
                status === s ? "bg-white shadow-sm text-brand-700" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {s === "All" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading && !invoices.length ? (
        <SkeletonRows count={6} />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="Create an invoice to bill your clients."
          action={<Button onClick={() => setFormOpen(true)}><Plus size={16} /> Create Invoice</Button>}
        />
      ) : (
        <InvoiceTable invoices={invoices} onPayment={setPaying} onDelete={setDeleting} />
      )}

      <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />

      <InvoiceForm
        open={formOpen || !!editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        invoice={editing}
        onSaved={handleSaved}
      />

      <PaymentModal
        invoice={paying}
        onClose={() => setPaying(null)}
        onSaved={() => { setPaying(null); load(); }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete Invoice"
        message={`Are you sure you want to delete ${deleting?.invoiceNumber}? This will not remove payment history.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
