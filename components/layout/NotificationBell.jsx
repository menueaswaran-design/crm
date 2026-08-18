"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  CalendarClock,
  AlertTriangle,
  Banknote,
  FileUp,
  ClipboardList,
  FileCheck2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/client";
import { formatDate } from "@/lib/utils";

const TYPE_META = {
  TASK_DUE: { icon: CalendarClock, cls: "bg-sky-50 text-sky-600" },
  TASK_OVERDUE: { icon: AlertTriangle, cls: "bg-rose-50 text-rose-600" },
  COMPLIANCE_DUE: { icon: FileCheck2, cls: "bg-amber-50 text-amber-600" },
  COMPLIANCE_OVERDUE: { icon: AlertTriangle, cls: "bg-rose-50 text-rose-600" },
  PAYMENT_DUE: { icon: Banknote, cls: "bg-emerald-50 text-emerald-600" },
  DOCUMENT_UPLOADED: { icon: FileUp, cls: "bg-brand-50 text-brand-600" },
  TASK_ASSIGNED: { icon: ClipboardList, cls: "bg-indigo-50 text-indigo-600" },
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const load = async () => {
    try {
      const json = await apiFetch("/api/notifications?limit=15");
      setItems(json.data || []);
      setUnread(json.unreadCount || 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markAll = async () => {
    setLoading(true);
    try {
      await apiFetch("/api/notifications", { method: "PATCH", body: { markAll: true } });
      await load();
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-popover z-50 overflow-hidden animate-slide-down">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-[11px] text-slate-400">
                {unread} unread · {items.length} total
              </p>
            </div>
            <button
              onClick={markAll}
              disabled={loading || unread === 0}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 disabled:opacity-40"
            >
              <CheckCheck size={13} /> Mark all
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {items.length === 0 && (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto h-10 w-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Bell size={18} />
                </div>
                <p className="mt-3 text-sm text-slate-500">You&apos;re all caught up</p>
              </div>
            )}
            {items.map((n) => {
              const meta = TYPE_META[n.type] || { icon: Bell, cls: "bg-slate-100 text-slate-500" };
              const Icon = meta.icon;
              return (
                <div key={String(n._id)} className={`px-5 py-3.5 flex items-start gap-3 ${n.isRead ? "" : "bg-brand-50/40"}`}>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${meta.cls}`}>
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-500 shrink-0" />}
                </div>
              );
            })}
          </div>
          <div className="border-t border-slate-100 p-2 bg-slate-50/60">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-[13px] font-medium text-brand-700 hover:text-brand-800 py-2 rounded-xl hover:bg-brand-50"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
