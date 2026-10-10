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
  LogIn,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
  TASK_ASSIGNED: { icon: ClipboardList, cls: "bg-brand-50 text-brand-600" },
  LOGIN: { icon: LogIn, cls: "bg-sky-50 text-sky-600" },
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const router = useRouter();

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
        className="relative rounded-lg p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white num">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] animate-slide-down overflow-hidden rounded-2xl border border-hairline bg-white shadow-popover">
          <div className="flex items-center justify-between border-b border-hairline bg-canvas/50 px-5 py-3">
            <div>
              <p className="text-[13px] font-semibold tracking-[-0.011em] text-slate-900">
                Notifications
              </p>
              <p className="text-[11px] text-slate-500 num">
                {unread} unread · {items.length} total
              </p>
            </div>
            <button
              onClick={markAll}
              disabled={loading || unread === 0}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:pointer-events-none disabled:opacity-40"
            >
              <CheckCheck size={13} /> Mark all
            </button>
          </div>
          <div className="max-h-80 divide-y divide-hairline/70 overflow-y-auto">
            {items.length === 0 && (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-canvas text-slate-400">
                  <Bell size={16} />
                </div>
                <p className="mt-2.5 text-[13px] text-slate-500">You&apos;re all caught up</p>
              </div>
            )}
            {items.map((n) => {
              const meta = TYPE_META[n.type] || { icon: Bell, cls: "bg-slate-100 text-slate-500" };
              const Icon = meta.icon;
              const isLogin = n.type === "LOGIN";
              return (
                <div
                  key={String(n._id)}
                  className={`flex items-start gap-3 px-5 py-3 transition-colors ${n.isRead ? "" : "bg-brand-50/40"} ${isLogin ? "cursor-pointer hover:bg-slate-50" : ""}`}
                  onClick={() => {
                    if (isLogin) {
                      router.push("/staff?tab=login-details");
                      setOpen(false);
                    }
                  }}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.cls}`}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-snug text-slate-900">
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">{n.message}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t border-hairline bg-canvas/50 p-1.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-lg py-2 text-center text-[13px] font-medium text-brand-700 transition-colors hover:bg-brand-50"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
