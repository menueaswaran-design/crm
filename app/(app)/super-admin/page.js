"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Users, RefreshCw, Pencil, History } from "lucide-react";
import { apiFetch, postData, patchData } from "@/lib/client";
import { useAuth } from "@/context/AuthContext";
import { getDefaultRoute } from "@/lib/permissions";
import Badge from "@/components/common/Badge";
import EmptyState from "@/components/common/EmptyState";
import { SkeletonRows } from "@/components/common/Loading";
import Button from "@/components/common/Button";
import ErrorBanner from "@/components/common/ErrorBanner";
import Modal from "@/components/common/Modal";
import { getErrorMessage } from "@/lib/utils";

export default function SuperAdminPage() {
  const router = useRouter();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "superAdmin";
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editError, setEditError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const json = await apiFetch("/api/companies");
      setCompanies(json.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!isSuperAdmin) {
      router.replace(getDefaultRoute(user));
      return;
    }
    load();
  }, [user, isSuperAdmin, router, load]);

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-400">Redirecting...</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await postData("/api/companies", form);
      setForm({ companyName: "", adminName: "", adminEmail: "", adminPassword: "" });
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (c) => {
    setEditing(c);
    setEditName(c.companyName || "");
    setEditActive(c.isActive !== false);
    setEditError("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    setEditError("");
    setSaving(true);
    try {
      await patchData(`/api/companies/${editing._id}`, {
        companyName: editName,
        isActive: editActive,
      });
      setEditing(null);
      load();
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            Companies &amp; Admins
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Each company gets a unique Organisation ID (orgId). Even two companies with the same
            name are fully isolated — tenancy never depends on the name.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw size={15} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus size={15} /> Add Company &amp; Admin
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {formOpen && (
        <section className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <Building2 size={17} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">New company &amp; admin</h2>
              <p className="text-xs text-slate-500">The admin logs in with these credentials and manages their own staff &amp; data.</p>
            </div>
          </div>

          {formError && <ErrorBanner message={formError} />}

          <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label-base">Company name</label>
              <input
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="e.g. Kumar & Associates"
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">Admin name</label>
              <input
                required
                value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                placeholder="e.g. Ravi Kumar"
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">Admin email</label>
              <input
                type="email"
                required
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                placeholder="admin@kumarassociates.com"
                className="input-base"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label-base">Admin password</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.adminPassword}
                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                placeholder="At least 6 characters"
                className="input-base"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <Button type="submit" loading={saving}>
                {saving ? "Creating..." : "Create company & admin"}
              </Button>
              <Button variant="secondary" type="button" onClick={() => { setFormOpen(false); setFormError(""); }}>
                Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <SkeletonRows count={4} />
      ) : companies.length === 0 ? (
        <EmptyState
          title="No companies yet"
          description="Add your first company and its admin account to get started."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Users size={16} /> Add Company &amp; Admin
            </Button>
          }
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Company</th>
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Org ID</th>
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Admin</th>
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Created</th>
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((c) => (
                  <tr key={c._id} className="hover:bg-brand-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 text-white flex items-center justify-center shrink-0">
                          <Building2 size={16} />
                        </div>
                        <p className="font-semibold text-slate-900">{c.companyName}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <code className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {c._id}
                      </code>
                      <p className="text-[11px] text-slate-400 mt-0.5">orgId → tenant key</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{c.adminUserId?.name || "—"}</p>
                      <p className="text-xs text-slate-400">{c.adminUserId?.email || "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        label={c.isActive ? "Active" : "Inactive"}
                        color={c.isActive ? "green" : "gray"}
                        dot
                      />
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                        <Pencil size={14} /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit organisation"
        description="Tenancy stays keyed to the Org ID — renaming can never leak data across tenants."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={saveEdit}>
              Save changes
            </Button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-4">
            {editError && <ErrorBanner message={editError} />}

            <div>
              <label className="label-base">Org ID (read-only tenant key)</label>
              <code className="block text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1.5 rounded break-all">
                {editing._id}
              </code>
            </div>

            <div>
              <label className="label-base">Company name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input-base"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-300"
              />
              Active (admins can log in and access this tenant)
            </label>

            {Array.isArray(editing.editHistory) && editing.editHistory.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  <History size={13} /> Edit history
                </div>
                <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                  {editing.editHistory.slice(-8).reverse().map((h, i) => (
                    <li key={i} className="px-3 py-2 text-xs">
                      <p className="text-slate-700">
                        <span className="font-medium">{h.editedByName || "super admin"}</span> changed{" "}
                        <code className="font-mono text-slate-500">{h.field}</code> from{" "}
                        <span className="text-slate-400 line-through inline-block max-w-[120px] truncate align-bottom">
                          {h.oldValue}
                        </span>{" "}
                        to <span className="font-medium text-slate-900">{h.newValue}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(h.editedAt).toLocaleString("en-IN")}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}