"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Download, Calendar } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { downloadCSV, downloadExcel } from "@/lib/export";
import { useAuth } from "@/context/AuthContext";
import Badge from "@/components/common/Badge";
import EmptyState from "@/components/common/EmptyState";
import { SkeletonRows } from "@/components/common/Loading";
import Button from "@/components/common/Button";
import Pagination from "@/components/common/Pagination";
import ErrorBanner from "@/components/common/ErrorBanner";
import { initials, getErrorMessage, formatDateTime } from "@/lib/utils";

export default function LoginDetails() {
  const { user: currentUser } = useAuth();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(null);

  const [dateFilter, setDateFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (dateFilter) params.set("date", dateFilter);
      else {
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);
      }
      const json = await apiFetch(`/api/login-history?${params.toString()}`);
      setRecords(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
      setTotal(json.pagination?.total || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, dateFilter, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [dateFilter, fromDate, toDate]);

  const filtered = records.filter(
    (r) =>
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.email?.toLowerCase().includes(search.toLowerCase())
  );

  const clearFilters = () => {
    setDateFilter("");
    setFromDate("");
    setToDate("");
    setSearch("");
  };

  const hasFilters = dateFilter || fromDate || toDate;

  const handleExport = (format) => {
    if (exporting) return;
    setExporting(format);
    try {
      const rows = filtered.map((r) => ({
        Name: r.name || "",
        Email: r.email || "",
        "Login Time": formatDateTime(r.timestamp),
        Date: r.timestamp ? new Date(r.timestamp).toLocaleDateString("en-IN") : "",
      }));
      if (format === "csv") {
        downloadCSV({
          filename: "login-history",
          headers: ["Name", "Email", "Login Time", "Date"],
          rows: rows.map((r) => [r.Name, r.Email, r["Login Time"], r.Date]),
        });
      } else {
        downloadExcel({ filename: "login-history", sheetName: "Login History", rows });
      }
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          Staff login history across all dates
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleExport("csv")} loading={exporting === "csv"} disabled={!!exporting}>
            <Download size={15} /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport("excel")} loading={exporting === "excel"} disabled={!!exporting}>
            <Download size={15} /> Excel
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="card p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="relative flex-1 min-w-0 sm:min-w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="input-base pl-9"
            />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Specific Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setFromDate(""); setToDate(""); }}
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setDateFilter(""); }}
                disabled={!!dateFilter}
                className="input-base disabled:opacity-40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setDateFilter(""); }}
                disabled={!!dateFilter}
                className="input-base disabled:opacity-40"
              />
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2 py-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Calendar size={13} />
          <span>
            {hasFilters
              ? `Filtered · ${total} record${total !== 1 ? "s" : ""}`
              : `All dates · ${total} record${total !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {loading ? (
        <SkeletonRows count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No login records found"
          description={hasFilters ? "Try adjusting your filters." : "No staff have logged in yet."}
          action={
            hasFilters && (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Staff Member</th>
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Login Time</th>
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r, i) => {
                  const isSelf = currentUser?._id === r.userId;
                  return (
                    <tr key={r._id || i} className="hover:bg-brand-50/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {initials(r.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {r.name}
                              {isSelf && <span className="ml-1.5 text-[11px] font-medium text-brand-600">(you)</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{r.email}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDateTime(r.timestamp)}</td>
                      <td className="px-5 py-4">
                        <Badge
                          label={r.timestamp ? new Date(r.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          color="blue"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
        </div>
      )}
    </div>
  );
}