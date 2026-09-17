"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  UserPlus,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { apiFetch } from "@/lib/client";
import { formatINR, formatDate, getErrorMessage, daysRemaining } from "@/lib/utils";
import {
  generatePaymentReminderMessage,
  generateComplianceOverdueMessage,
} from "@/lib/whatsappMessages";
import WhatsAppButton from "@/components/whatsapp/WhatsAppButton";
import Button from "@/components/common/Button";
import ErrorBanner from "@/components/common/ErrorBanner";
import EmptyState from "@/components/common/EmptyState";
import { useAuth } from "@/context/AuthContext";

function StatPill({ label, value, tone }) {
  const tones = {
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    sky: "bg-sky-50 text-sky-700 border-sky-100",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone] || tones.slate}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

export default function TodayPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const json = await apiFetch("/api/dashboard/today");
      setData(json.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-8 w-56" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  const counts = data?.counts || {};
  const overdue = data?.overdueFilings || [];
  const unpaid = data?.unpaidInvoices || [];
  const unassigned = data?.unassignedClients || [];
  const totalActions = counts.actionItems || 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            Today
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Chase fees, remind overdue filings, assign clients — your practice action list
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </Button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Full dashboard <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatPill label="Overdue filings" value={counts.overdueFilings ?? 0} tone="rose" />
        <StatPill label="Unpaid invoices" value={counts.unpaidInvoices ?? 0} tone="amber" />
        <StatPill label="Unassigned clients" value={counts.unassignedClients ?? 0} tone="sky" />
      </div>

      {totalActions === 0 ? (
        <EmptyState
          title="You're clear for now"
          description="No overdue filings, unpaid invoices, or unassigned clients. Nice work."
          icon={CheckCircle2}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Overdue filings */}
          <section className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Remind filing</h2>
                  <p className="text-xs text-slate-400">Overdue compliance — one-click WhatsApp</p>
                </div>
              </div>
              <Link href="/compliance?status=OVERDUE" className="text-xs font-medium text-indigo-600 hover:underline">
                View all
              </Link>
            </div>
            {overdue.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">No overdue filings</p>
            ) : (
              <ul className="divide-y divide-slate-50 max-h-[28rem] overflow-y-auto">
                {overdue.map((item) => {
                  const days = daysRemaining(item.dueDate);
                  const client = item.client;
                  return (
                    <li key={item.id} className="px-5 py-3.5 flex items-start gap-3">
                      <div className="mt-0.5 h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                        {days !== null ? `${Math.abs(days)}d` : "—"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {item.type}
                          {item.period ? ` · ${item.period}` : ""}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{client?.name || "No client"}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <CalendarClock size={10} /> Due {formatDate(item.dueDate)}
                        </p>
                      </div>
                      {client?.phone && (
                        <WhatsAppButton
                          phone={client.phone}
                          client={client}
                          clientId={client._id}
                          message={generateComplianceOverdueMessage({
                            client,
                            compliance: item,
                          })}
                          label="Remind"
                          messageType="COMPLIANCE_OVERDUE"
                          iconOnly
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Unpaid invoices */}
          <section className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Banknote size={16} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Chase fee</h2>
                  <p className="text-xs text-slate-400">Outstanding invoices — one-click WhatsApp</p>
                </div>
              </div>
              <Link href="/invoices?status=OVERDUE" className="text-xs font-medium text-indigo-600 hover:underline">
                View all
              </Link>
            </div>
            {unpaid.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">No unpaid invoices</p>
            ) : (
              <ul className="divide-y divide-slate-50 max-h-[28rem] overflow-y-auto">
                {unpaid.map((inv) => {
                  const client = inv.client;
                  return (
                    <li key={inv.id} className="px-5 py-3.5 flex items-start gap-3">
                      <div className="mt-0.5 h-9 w-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                        <Banknote size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{client?.name || "No client"}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Due {formatDate(inv.dueDate)} ·{" "}
                          <span className="font-semibold text-amber-700">
                            {formatINR(inv.outstandingAmount)} outstanding
                          </span>
                        </p>
                      </div>
                      {client?.phone && (
                        <WhatsAppButton
                          phone={client.phone}
                          client={client}
                          clientId={client._id}
                          message={generatePaymentReminderMessage({
                            client,
                            invoice: inv,
                          })}
                          label="Chase fee"
                          messageType="PAYMENT_REMINDER"
                          iconOnly
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Unassigned — admin */}
          {user?.role === "admin" && (
            <section className="card p-0 overflow-hidden lg:col-span-2">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                    <UserPlus size={16} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">Unassigned clients</h2>
                    <p className="text-xs text-slate-400">Assign staff so work doesn’t stall</p>
                  </div>
                </div>
                <Link
                  href="/clients?all=1&assigned=unassigned"
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  Open clients
                </Link>
              </div>
              {unassigned.length === 0 ? (
                <p className="px-5 py-8 text-sm text-slate-400 text-center">All clients are assigned</p>
              ) : (
                <ul className="divide-y divide-slate-50 sm:grid sm:grid-cols-2 sm:divide-y-0">
                  {unassigned.map((c) => (
                    <li
                      key={c.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-3 sm:border-b border-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {[c.clientCode, c.category, c.pan].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <Link
                        href={`/clients/${c.id}`}
                        className="shrink-0 text-xs font-medium text-indigo-600 hover:underline"
                      >
                        Assign
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
