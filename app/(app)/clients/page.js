"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, FileSpreadsheet } from "lucide-react";
import { getList, deleteData, buildQuery } from "@/lib/client";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/context/AuthContext";
import ClientCard from "@/components/clients/ClientCard";
import ClientForm from "@/components/clients/ClientForm";
import ImportClientsModal from "@/components/clients/ImportClientsModal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Pagination from "@/components/common/Pagination";
import EmptyState from "@/components/common/EmptyState";
import { SkeletonCards } from "@/components/common/Loading";
import Button from "@/components/common/Button";
import { CLIENT_CATEGORIES } from "@/lib/utils";

export default function ClientsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [assigned, setAssigned] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, assigned, page, isAdmin]);

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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} clients</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet size={15} /> Import
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={15} /> Add Client
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-0 sm:min-w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, PAN, email..."
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
      </div>

      {loading ? (
        <SkeletonCards count={6} />
      ) : clients.length === 0 ? (
        <EmptyState
          title="No clients found"
          description={
            assigned === "unassigned"
              ? "No unassigned clients right now."
              : "Try adjusting filters, or add a new client."
          }
          action={<Button onClick={() => setFormOpen(true)}><Plus size={15} /> Add Client</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((c) => (
            <ClientCard key={c._id} client={c} onEdit={setEditing} onDelete={setDeleting} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />

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
