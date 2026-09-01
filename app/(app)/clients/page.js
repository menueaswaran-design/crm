"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, FileSpreadsheet, LayoutGrid, Table2, Download, List, Users } from "lucide-react";
import { getList, deleteData, buildQuery } from "@/lib/client";
import { downloadCSV, downloadExcel, fetchAllList, formatExportDate } from "@/lib/export";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/context/AuthContext";
import ClientCard from "@/components/clients/ClientCard";
import ClientsTable from "@/components/clients/ClientsTable";
import ClientsList from "@/components/clients/ClientsList";
import ClientForm from "@/components/clients/ClientForm";
import ImportClientsModal from "@/components/clients/ImportClientsModal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Pagination from "@/components/common/Pagination";
import EmptyState from "@/components/common/EmptyState";
import { SkeletonCards } from "@/components/common/Loading";
import Button from "@/components/common/Button";
import ErrorBanner from "@/components/common/ErrorBanner";
import Loading from "@/components/common/Loading";
import { CLIENT_CATEGORIES, getErrorMessage } from "@/lib/utils";

function ClientsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [assigned, setAssigned] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const hasActiveQuery = Boolean(debouncedSearch.trim()) || Boolean(category) || Boolean(assigned);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (searchParams.get("all") === "1") {
      setShowAll(true);
    }
  }, [searchParams]);

  const shouldLoad = showAll || hasActiveQuery;

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exporting, setExporting] = useState(null);

  const load = useCallback(async () => {
    if (!shouldLoad) {
      setClients([]);
      setTotal(0);
      setTotalPages(1);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data, pagination } = await getList(
        `/api/clients${buildQuery({
          search: debouncedSearch,
          category,
          assigned: isAdmin ? assigned : "",
          page,
          limit: 12,
        })}`
      );
      setClients(data);
      setTotal(pagination.total || 0);
      setTotalPages(pagination.totalPages || 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, assigned, page, isAdmin, shouldLoad]);

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
      await deleteData(`/api/clients/${deleting._id}`);
      setDeleting(null);
      load();
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (exporting) return;
    if (!shouldLoad) return;
    setExporting(format);
    try {
      const all = await fetchAllList("/api/clients", {
        search: debouncedSearch,
        category,
        assigned: isAdmin ? assigned : "",
      });
      const rows = all.map((c) => ({
        "Client ID": c.clientCode || "",
        Name: c.name,
        Category: c.category || "",
        PAN: c.pan || "",
        GSTIN: c.gstin || "",
        Email: c.email || "",
        Phone: c.phone || "",
        Staff: c.assignedStaff?.name || "",
        Status: c.status || "",
        Added: formatExportDate(c.createdAt),
      }));
      if (format === "csv") {
        downloadCSV({
          filename: "clients",
          headers: Object.keys(rows[0] || {}),
          rows: rows.map((r) => Object.values(r)),
        });
      } else {
        downloadExcel({ filename: "clients", sheetName: "Clients", rows });
      }
    } finally {
      setExporting(null);
    }
  };

  const handleViewAll = () => {
    setShowAll(true);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setCategory("");
    setAssigned("");
    setShowAll(false);
    setPage(1);
  };

  const subtitle = shouldLoad
    ? showAll && !hasActiveQuery
      ? `Showing all ${total} client${total === 1 ? "" : "s"}`
      : `${total} client${total === 1 ? "" : "s"} found`
    : "Search or filter to browse client records";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-slate-200 bg-white overflow-hidden" role="group" aria-label="View format">
            <button
              onClick={() => setView("grid")}
              title="Card view"
              className={`p-2 transition-colors ${view === "grid" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setView("table")}
              title="Table view"
              className={`p-2 transition-colors ${view === "table" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              <Table2 size={15} />
            </button>
            <button
              onClick={() => setView("list")}
              title="Compact list view"
              className={`p-2 transition-colors ${view === "list" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              <List size={15} />
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={() => handleExport("csv")} loading={exporting === "csv"} disabled={!!exporting || !shouldLoad}>
            <Download size={15} /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport("excel")} loading={exporting === "excel"} disabled={!!exporting || !shouldLoad}>
            <Download size={15} /> Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet size={15} /> Import
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={15} /> Add Client
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-0 sm:min-w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, PAN, GSTIN, phone or email..."
            className="input-base pl-9"
          />
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="input-base w-full sm:w-auto sm:min-w-40 cursor-pointer"
        >
          <option value="">All Categories</option>
          {CLIENT_CATEGORIES.map((c) => (
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
        {!shouldLoad && (
          <Button variant="secondary" size="sm" onClick={handleViewAll} className="w-full sm:w-auto">
            <Users size={15} /> View all clients
          </Button>
        )}
      </div>

      {!shouldLoad ? (
        <EmptyState
          variant="search"
          title="Search to view clients"
          description="For faster loading with large client lists, enter a name, PAN, GSTIN, phone or email — or use the category and assignment filters above."
          action={
            <div className="flex flex-col items-center gap-3">
              <Button variant="secondary" size="sm" onClick={handleViewAll}>
                <Users size={15} /> View all clients
              </Button>
              <p className="text-xs text-slate-400">
                You can still add or import clients using the buttons above.
              </p>
            </div>
          }
        />
      ) : loading ? (
        <SkeletonCards count={6} />
      ) : clients.length === 0 ? (
        <EmptyState
          variant="unavailable"
          title="No clients match your search"
          description={
            assigned === "unassigned"
              ? "No unassigned clients match these filters. Try a different search or filter."
              : "No client records match your search or filters. Try different keywords or clear filters."
          }
          action={
            <Button variant="secondary" size="sm" onClick={handleClearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : view === "table" ? (
        <ClientsTable clients={clients} onEdit={setEditing} onDelete={setDeleting} />
      ) : view === "list" ? (
        <ClientsList clients={clients} onEdit={setEditing} onDelete={setDeleting} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((c) => (
            <ClientCard key={c._id} client={c} onEdit={setEditing} onDelete={setDeleting} />
          ))}
        </div>
      )}

      {shouldLoad && <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />}

      <ClientForm
        open={formOpen || !!editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        client={editing}
        onSaved={handleSaved}
      />

      <ImportClientsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={load}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete Client"
        message={`Are you sure you want to delete "${deleting?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading label="Loading clients..." />}>
      <ClientsPage />
    </Suspense>
  );
}
