"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  IdCard,
  Building2,
  Fingerprint,
  User,
  Trash2,
  FileText,
  Receipt,
  CalendarClock,
  CheckSquare,
  Pencil,
  Plus,
} from "lucide-react";
import { apiFetch, deleteData } from "@/lib/client";
import { maskAadhaar, formatDate } from "@/lib/utils";
import { CategoryBadge, StatusBadge } from "@/components/common/Badge";
import Button from "@/components/common/Button";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Loading from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";

const CATEGORY_GRADIENTS = {
  Individual: "from-sky-400 to-blue-600",
  Proprietor: "from-emerald-400 to-teal-600",
  "Pvt Ltd": "from-brand-400 to-brand-700",
  LLP: "from-violet-400 to-purple-600",
  Partnership: "from-amber-400 to-orange-600",
  HUF: "from-rose-400 to-pink-600",
  Other: "from-slate-400 to-slate-600",
};

export default function ClientDetailsPage() {
  const { clientId } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await apiFetch(`/api/clients/${clientId}`);
      setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="Loading client details..." />;
  if (!data) return <EmptyState title="Client not found" />;

  const { client, compliance, tasks, documents, invoices, activities } = data;
  const gradient = CATEGORY_GRADIENTS[client.category] || CATEGORY_GRADIENTS.Other;

  const infoItems = [
    { icon: IdCard, label: "PAN", value: client.pan || "—" },
    { icon: Fingerprint, label: "Aadhaar", value: maskAadhaar(client.aadhaar) },
    { icon: Building2, label: "GSTIN", value: client.gstin || "—" },
    { icon: Building2, label: "CIN", value: client.cin || "—" },
    { icon: Mail, label: "Email", value: client.email || "—" },
    { icon: Phone, label: "Phone", value: client.phone || "—" },
    { icon: MapPin, label: "Address", value: client.address || "—" },
    { icon: User, label: "Assigned Staff", value: client.assignedStaff?.name || "Unassigned" },
  ];

  const statTiles = [
    { label: "Compliance", value: compliance.length, icon: CalendarClock, cls: "bg-amber-50 text-amber-600", href: "/compliance" },
    { label: "Tasks", value: tasks.length, icon: CheckSquare, cls: "bg-sky-50 text-sky-600", href: "/tasks" },
    { label: "Documents", value: documents.length, icon: FileText, cls: "bg-brand-50 text-brand-600", href: "/documents" },
    { label: "Invoices", value: invoices.length, icon: Receipt, cls: "bg-emerald-50 text-emerald-600", href: "/invoices" },
  ];

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteData(`/api/clients/${clientId}`);
      router.push("/clients");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4">
          <ArrowLeft size={15} /> Back to Clients
        </Link>

        <div className="card p-6 sm:p-8 bg-gradient-to-br from-white to-slate-50 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand-50 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-center gap-5">
              <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center text-xl font-bold shadow-lg`}>
                {client.name?.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">{client.name}</h1>
                  <CategoryBadge label={client.category} />
                  <StatusBadge status={client.status} />
                </div>
                <p className="text-sm text-slate-500 mt-1.5">
                  Client since {formatDate(client.createdAt)} · {client.email || "no email on file"}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => router.push("/clients")}>
                    <Pencil size={13} /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="text-rose-600 hover:bg-rose-50">
                    <Trash2 size={13} /> Delete
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
              {statTiles.map((t) => (
                <Link
                  key={t.label}
                  href={t.href}
                  className="flex items-center gap-2.5 rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 card-hover min-w-[8.5rem]"
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${t.cls}`}>
                    <t.icon size={16} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900 leading-none">{t.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">{t.label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Basic info */}
        <div className="card p-6 self-start lg:sticky lg:top-24">
          <h2 className="font-semibold text-slate-900 mb-4">Basic Information</h2>
          <dl className="space-y-3.5">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <item.icon size={15} className="text-slate-300 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <dt className="text-[11px] uppercase tracking-wider text-slate-400">{item.label}</dt>
                  <dd className="text-sm text-slate-800 break-words font-medium">{item.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-slate-900">Compliance</h2>
                <p className="text-xs text-slate-400 mt-0.5">Recent records</p>
              </div>
              <Link href="/compliance" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                View all
              </Link>
            </div>
            {compliance.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No compliance records</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {compliance.slice(0, 5).map((c) => (
                  <li key={c._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <CalendarClock size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{c.type}</p>
                        <p className="text-xs text-slate-500">
                          Due {formatDate(c.dueDate)} · {c.period || "—"}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">Tasks</h2>
                <Link href="/tasks" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                  View all
                </Link>
              </div>
              {tasks.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No tasks</p>
              ) : (
                <ul className="space-y-2.5">
                  {tasks.slice(0, 5).map((t) => (
                    <li key={t._id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckSquare size={14} className="text-slate-300 shrink-0" />
                        <p className="text-sm text-slate-700 truncate">{t.title}</p>
                      </div>
                      <StatusBadge status={t.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">Documents</h2>
                <Link href="/documents" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                  View all
                </Link>
              </div>
              {documents.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No documents</p>
              ) : (
                <ul className="space-y-2.5">
                  {documents.slice(0, 5).map((d) => (
                    <li key={d._id} className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                        <FileText size={14} />
                      </div>
                      <p className="text-sm text-slate-700 truncate">{d.name}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-slate-900">Invoices</h2>
                <p className="text-xs text-slate-400 mt-0.5">Billing history</p>
              </div>
              <Link href="/invoices" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                View all
              </Link>
            </div>
            {invoices.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No invoices</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {invoices.slice(0, 5).map((inv) => (
                  <li key={inv._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Receipt size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{inv.invoiceNumber}</p>
                        <p className="text-xs text-slate-500">{formatDate(inv.invoiceDate)}</p>
                      </div>
                    </div>
                    <StatusBadge status={inv.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Activity</h2>
            {activities.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No activity recorded</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {activities.map((a) => (
                  <li key={a._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-brand-400 ring-4 ring-brand-50 shrink-0" />
                      <p className="text-sm text-slate-700 truncate">{a.description}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{formatDate(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Client"
        message={`Are you sure you want to delete "${client.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
        loading={deleteLoading}
      />
    </div>
  );
}
