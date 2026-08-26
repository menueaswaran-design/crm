"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { getList, deleteData, buildQuery } from "@/lib/client";
import { useAuth } from "@/context/AuthContext";
import ComplianceCard from "@/components/compliance/ComplianceCard";
import UpcomingDeadlinesCard from "@/components/dashboard/UpcomingDeadlinesCard";
import ComplianceForm from "@/components/compliance/ComplianceForm";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Pagination from "@/components/common/Pagination";
import EmptyState from "@/components/common/EmptyState";
import { SkeletonCards } from "@/components/common/Loading";
import Button from "@/components/common/Button";
import { COMPLIANCE_CATEGORIES } from "@/lib/utils";

const TABS = ["All", "Pending", "In Progress", "Overdue", "Completed"];

export default function CompliancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [type, setType] = useState("");
  const [assigned, setAssigned] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({});

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [upcomingRefresh, setUpcomingRefresh] = useState(0);

  const load = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    try {
      const statusParam = tab === "All" ? "" : tab.toUpperCase().replace(" ", "_");
      const { data, pagination } = await getList(
        `/api/compliance${buildQuery({
          status: statusParam,
          type,
          assigned: isAdmin ? assigned : "",
          page,
          limit: 12,
        })}`
      );
      setRecords(data);
      setTotalPages(pagination.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }, [tab, type, assigned, page, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const loadCounts = useCallback(async () => {
    try {
      const c = {};
      for (const t of TABS) {
        const status = t === "All" ? "" : t.toUpperCase().replace(" ", "_");
        const r = await fetch(
          `/api/compliance${buildQuery({
            status,
            assigned: isAdmin ? assigned : "",
            limit: 1,
          })}`
        );
        const j = await r.json();
        c[t] = j.pagination?.total || 0;
      }
      setCounts(c);
    } catch {
      // ignore
    }
  }, [assigned, isAdmin]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts, records.length]);

  const handleSaved = () => {
    setFormOpen(false);
    setEditing(null);
    load();
    loadCounts();
    setUpcomingRefresh((k) => k + 1);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteData(`/api/compliance/${deleting._id}`);
      setDeleting(null);
      load();
      loadCounts();
      setUpcomingRefresh((k) => k + 1);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Compliance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track filings and due dates</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus size={15} /> Add Compliance
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="flex flex-col gap-3">
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setPage(1); }}
                  className={`shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    tab === t
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t}
                  <span className={`ml-1.5 text-xs ${tab === t ? "text-slate-300" : "text-slate-400"}`}>
                    {counts[t] ?? "–"}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <select
                value={type}
                onChange={(e) => { setType(e.target.value); setPage(1); }}
                className="input-base w-full sm:w-auto sm:min-w-40 cursor-pointer"
              >
                <option value="">All Types</option>
                {COMPLIANCE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {isAdmin && (
                <select
                  value={assigned}
                  onChange={(e) => { setAssigned(e.target.value); setPage(1); }}
                  className="input-base w-full sm:w-auto sm:min-w-40 cursor-pointer"
                >
                  <option value="">All Assignments</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              )}
            </div>
          </div>

          {loading ? (
            <SkeletonCards count={4} />
          ) : records.length === 0 ? (
            <EmptyState
              title="No compliance records found"
              description={
                assigned === "unassigned"
                  ? "No unassigned compliance records right now."
                  : "Create a compliance record to start tracking due dates."
              }
              action={<Button onClick={() => setFormOpen(true)}><Plus size={15} /> Add Compliance</Button>}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {records.map((r) => (
                <ComplianceCard
                  key={r._id}
                  record={r}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                  onStatusChange={() => {
                    load({ silent: true });
                    loadCounts();
                    setUpcomingRefresh((k) => k + 1);
                  }}
                />
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>

        <div className="lg:sticky lg:top-6 self-start">
          <UpcomingDeadlinesCard refreshKey={upcomingRefresh} />
        </div>
      </div>

      <ComplianceForm
        open={formOpen || !!editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        record={editing}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete Compliance"
        message={`Delete ${deleting?.type} for ${deleting?.clientId?.name}?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
