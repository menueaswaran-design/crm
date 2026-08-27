"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, CalendarClock, AlertTriangle, CalendarDays, CreditCard, FileText, ClipboardList, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { formatDate, getErrorMessage } from "@/lib/utils";
import { SkeletonRows } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/common/Button";
import ErrorBanner from "@/components/common/ErrorBanner";

const TYPE_META = {
  TASK_DUE: { icon: CalendarClock, cls: "bg-sky-50 text-sky-600" },
  TASK_OVERDUE: { icon: AlertTriangle, cls: "bg-rose-50 text-rose-600" },
  COMPLIANCE_DUE: { icon: CalendarDays, cls: "bg-indigo-50 text-indigo-600" },
  COMPLIANCE_OVERDUE: { icon: ShieldAlert, cls: "bg-orange-50 text-orange-600" },
  PAYMENT_DUE: { icon: CreditCard, cls: "bg-emerald-50 text-emerald-600" },
  DOCUMENT_UPLOADED: { icon: FileText, cls: "bg-purple-50 text-purple-600" },
  TASK_ASSIGNED: { icon: ClipboardList, cls: "bg-teal-50 text-teal-600" },
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const json = await apiFetch("/api/notifications?limit=100");
      setItems(json.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    await apiFetch("/api/notifications", { method: "PATCH", body: { markAll: true } });
    load();
  };

  const markOne = async (id) => {
    await apiFetch("/api/notifications", { method: "PATCH", body: { id } });
    load();
  };

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "You're all caught up"}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={markAll} disabled={unread === 0}>
          <CheckCheck size={14} /> Mark all as read
        </Button>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <SkeletonRows count={6} />
      ) : items.length === 0 ? (
        <EmptyState title="No notifications" description="You're all caught up." />
      ) : (
        <div className="card p-0 divide-y divide-slate-100 overflow-hidden">
          {items.map((n) => {
            const meta = TYPE_META[n.type] || { icon: Bell, cls: "bg-slate-100 text-slate-500" };
            const Icon = meta.icon;
            return (
              <button
                key={String(n._id)}
                onClick={() => !n.isRead && markOne(n._id)}
                className={`w-full text-left px-5 py-4 flex items-start gap-3.5 transition-colors ${
                  n.isRead ? "bg-white hover:bg-slate-50" : "bg-brand-50/40 hover:bg-brand-50/70"
                }`}
              >
                <span className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${meta.cls}`}>
                  <Icon size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                  <p className="text-[13px] text-slate-600 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatDate(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
