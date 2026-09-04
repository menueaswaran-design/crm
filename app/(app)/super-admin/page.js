"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Users, RefreshCw } from "lucide-react";
import { apiFetch, postData } from "@/lib/client";
import { useAuth } from "@/context/AuthContext";
import { getDefaultRoute } from "@/lib/permissions";
import Badge from "@/components/common/Badge";
import EmptyState from "@/components/common/EmptyState";
import { SkeletonRows } from "@/components/common/Loading";
import Button from "@/components/common/Button";
import ErrorBanner from "@/components/common/ErrorBanner";
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            Companies &amp; Admins
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create a company and its admin account. Each admin works in their own isolated workspace.
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
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Admin</th>
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5 font-semibold uppercase tracking-wide">Created</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}