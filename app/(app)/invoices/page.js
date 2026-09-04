"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, ReceiptText, Download } from "lucide-react";
import { getList, deleteData, buildQuery, apiFetch } from "@/lib/client";
import { downloadCSV, downloadExcel, fetchAllList, formatExportCurrency, roundMoney } from "@/lib/export";
import { formatDate, getErrorMessage } from "@/lib/utils";
import InvoiceCards from "@/components/invoices/InvoiceCards";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import PaymentModal from "@/components/invoices/PaymentModal";
import InvoiceSummaryCards from "@/components/invoices/InvoiceSummaryCards";
import Pagination from "@/components/common/Pagination";
import EmptyState from "@/components/common/EmptyState";
import { SkeletonRows } from "@/components/common/Loading";
import Button from "@/components/common/Button";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ErrorBanner from "@/components/common/ErrorBanner";

const STATUSES = ["All", "PENDING", "PARTIAL", "PAID", "OVERDUE"];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
  const [exporting, setExporting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, pagination } = await getList(
        `/api/invoices${buildQuery({ status, page, limit: 15 })}`
      );
      setInvoices(data);
      setTotalPages(pagination.totalPages || 1);
      setTotal(pagination.total || 0);

      // Totals across the full dataset come from the dashboard summary.
      const s = await apiFetch("/api/dashboard/summary");
      setTotals({
        totalRevenue: s.data?.totalRevenue,
        amountReceived: s.data?.amountReceived,
        outstanding: s.data?.outstandingAmount,
      });
    } catch (err) {
      setError(getErrorMessage(err));
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

  const handleExport = async (format) => {
    if (exporting) return;
    setExporting(format);
    try {
      const all = await fetchAllList("/api/invoices", { status });
      if (format === "csv") {
        downloadCSV({
          filename: "invoices",
          headers: [
            "Invoice #",
            "Client",
            "Invoice Date",
            "Due Date",
            "Subtotal",
            "GST Rate (%)",
            "GST Amount",
            "Total Amount",
            "Paid Amount",
            "Outstanding",
            "Status",
          ],
          rows: all.map((inv) => [
            inv.invoiceNumber,
            inv.clientId?.name || "",
            formatDate(inv.invoiceDate),
            formatDate(inv.dueDate),
            formatExportCurrency(inv.subtotal),
            Number(inv.gstRate) || 0,
            formatExportCurrency(inv.gstAmount),
            formatExportCurrency(inv.totalAmount),
            formatExportCurrency(inv.paidAmount),
            formatExportCurrency(inv.outstandingAmount),
            inv.status || "",
          ]),
        });
      } else {
        downloadExcel({
          filename: "invoices",
          sheetName: "Invoices",
          rows: all.map((inv) => ({
            "Invoice #": inv.invoiceNumber,
            Client: inv.clientId?.name || "",
            "Invoice Date": formatDate(inv.invoiceDate),
            "Due Date": formatDate(inv.dueDate),
            "Subtotal (INR)": roundMoney(inv.subtotal),
            "GST Rate (%)": Number(inv.gstRate) || 0,
            "GST Amount (INR)": roundMoney(inv.gstAmount),
            "Total Amount (INR)": roundMoney(inv.totalAmount),
            "Paid Amount (INR)": roundMoney(inv.paidAmount),
            "Outstanding (INR)": roundMoney(inv.outstandingAmount),
            Status: inv.status || "",
          })),
        });
      }
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">Billing and payments</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleExport("csv")} loading={exporting === "csv"} disabled={!!exporting}>
            <Download size={15} /> <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport("excel")} loading={exporting === "excel"} disabled={!!exporting}>
            <Download size={15} /> <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={15} /> <span className="hidden sm:inline">Create Invoice</span>
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      <InvoiceSummaryCards totals={totals} loading={loading && !totals} />

      <div className="card p-3 sm:p-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold">
          <ReceiptText size={14} className="sm:hidden" /> <ReceiptText size={16} className="hidden sm:block" /> {status === "All" ? "All invoices" : status.charAt(0) + status.slice(1).toLowerCase()}
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-[13px] font-medium transition-all ${
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
          variant="unavailable"
          title="No invoices found"
          description="No invoices match your current filter. Create one to bill your clients."
          action={<Button onClick={() => setFormOpen(true)}><Plus size={16} /> Create Invoice</Button>}
        />
      ) : (
        <InvoiceCards invoices={invoices} onPayment={setPaying} onDelete={setDeleting} />
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
