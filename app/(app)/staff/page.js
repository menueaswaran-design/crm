"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, UserPlus, Search, ShieldCheck, Pencil, Power } from "lucide-react";
import { apiFetch, patchData, deleteData } from "@/lib/client";
import { useAuth } from "@/context/AuthContext";
import StaffForm from "@/components/staff/StaffForm";
import Badge from "@/components/common/Badge";
import EmptyState from "@/components/common/EmptyState";
import { SkeletonRows } from "@/components/common/Loading";
import Button from "@/components/common/Button";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { initials } from "@/lib/utils";

export default function StaffPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await apiFetch("/api/users");
      setStaff(json.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = staff.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const confirmDeactivate = async () => {
    if (!deactivating) return;
    setActionLoading(true);
    try {
      if (deactivating.isActive) {
        await deleteData(`/api/users/${deactivating._id}`);
      } else {
        await patchData(`/api/users/${deactivating._id}`, { isActive: true });
      }
      setDeactivating(null);
      load();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Staff</h1>
          <p className="text-sm text-slate-500 mt-0.5">Team members and access</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <UserPlus size={15} /> Add Staff
          </Button>
        )}
      </div>

      {!isAdmin && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          You have view-only access. Only administrators can add or edit staff members.
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-0 sm:min-w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="input-base pl-9"
          />
        </div>
        <p className="text-sm text-slate-500 sm:ml-auto">
          {staff.length} member{staff.length !== 1 ? "s" : ""}
        </p>
      </div>

      {loading ? (
        <SkeletonRows count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No staff found"
          description={isAdmin ? "Add your team members to get started." : "No team members match your search."}
          action={
            isAdmin && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus size={16} /> Add Staff
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
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Member</th>
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Contact</th>
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Role</th>
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Status</th>
                  {isAdmin && <th className="px-5 py-3.5 font-semibold uppercase tracking-wide text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => {
                  const isSelf = currentUser?._id === u._id;
                  return (
                    <tr key={u._id} className="hover:bg-brand-50/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {initials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {u.name}
                              {isSelf && <span className="ml-1.5 text-[11px] font-medium text-brand-600">(you)</span>}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{u.phone || "—"}</td>
                      <td className="px-5 py-4">
                        <Badge
                          label={u.role === "admin" ? "Admin" : "Staff"}
                          color={u.role === "admin" ? "indigo" : "blue"}
                          dot
                        />
                      </td>
                      <td className="px-5 py-4">
                        <Badge label={u.isActive ? "Active" : "Inactive"} color={u.isActive ? "green" : "gray"} dot />
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => { setEditing(u); setFormOpen(true); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                              aria-label="Edit staff"
                            >
                              <Pencil size={15} />
                            </button>
                            {!isSelf && (
                              <button
                                onClick={() => setDeactivating(u)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  u.isActive
                                    ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                    : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                                }`}
                                aria-label={u.isActive ? "Deactivate" : "Activate"}
                              >
                                <Power size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <StaffForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        staff={editing}
        onSaved={() => { load(); setEditing(null); }}
      />

      <ConfirmDialog
        open={!!deactivating}
        title={deactivating?.isActive ? "Deactivate Staff" : "Activate Staff"}
        message={
          deactivating?.isActive
            ? `Deactivate ${deactivating?.name}? They will no longer be able to access the CRM.`
            : `Activate ${deactivating?.name}? They will regain access to the CRM.`
        }
        danger={deactivating?.isActive ? true : false}
        confirmLabel={deactivating?.isActive ? "Deactivate" : "Activate"}
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivating(null)}
        loading={actionLoading}
      />
    </div>
  );
}
