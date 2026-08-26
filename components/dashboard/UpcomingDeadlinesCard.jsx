"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, Clock, ClipboardList } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { formatDate, daysRemaining } from "@/lib/utils";
import DueCalendarModal from "@/components/dashboard/DueCalendarModal";

/**
 * The "Upcoming Deadlines" card from the dashboard.
 * Pass `items` (already-fetched deadlines) to render statically,
 * or omit it to let the card fetch /api/dashboard/upcoming itself.
 * Bump `refreshKey` to re-fetch in self-fetch mode.
 * Overdue items are excluded from the list — a red count badge next to
 * the calendar icon shows how many are overdue (click it to view them).
 */
export default function UpcomingDeadlinesCard({ items = null, refreshKey = 0 }) {
  const selfFetch = items === null;
  const [fetched, setFetched] = useState([]);
  const [loading, setLoading] = useState(selfFetch);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [view, setView] = useState("upcoming"); // "upcoming" | "overdue"
  const deadlines = selfFetch ? fetched : items;

  useEffect(() => {
    if (!selfFetch) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch("/api/dashboard/upcoming");
        if (alive) setFetched(res.data || []);
      } catch {
        // ignore
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selfFetch, refreshKey]);

  useEffect(() => {
    if (view === "overdue" && overdueItems.length === 0) setView("upcoming");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlines]);

  const { upcomingItems, overdueItems } = useMemo(() => {
    const up = [];
    const late = [];
    for (const item of deadlines) {
      const days = daysRemaining(item.dueDate);
      if (days !== null && days < 0) late.push(item);
      else up.push(item);
    }
    return { upcomingItems: up, overdueItems: late };
  }, [deadlines]);

  const shown = view === "overdue" ? overdueItems : upcomingItems;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-slate-900">Upcoming Deadlines</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {view === "overdue"
              ? `${overdueItems.length} overdue item${overdueItems.length === 1 ? "" : "s"}`
              : "Next 8 due items"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {overdueItems.length > 0 && (
            <button
              onClick={() => setView(view === "overdue" ? "upcoming" : "overdue")}
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold transition-colors ${
                view === "overdue"
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100"
              }`}
              title={view === "overdue" ? "Show upcoming deadlines" : "Show overdue items"}
              aria-label={`${overdueItems.length} overdue — click to view`}
            >
              <AlertTriangle size={12} /> {overdueItems.length}
            </button>
          )}
          <button
            onClick={() => setCalendarOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="View month-wise due calendar"
            aria-label="Open due dates calendar"
          >
            <CalendarDays size={18} />
          </button>
        </div>
      </div>
      {loading ? (
        <ul className="space-y-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="skeleton h-9 w-9 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3 w-2/3" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </li>
          ))}
        </ul>
      ) : shown.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">
          {view === "overdue" ? "Nothing overdue — all caught up" : "No upcoming deadlines"}
        </p>
      ) : (
        <ul className="space-y-3.5">
          {shown.slice(0, view === "overdue" ? overdueItems.length : 6).map((item) => {
            const days = daysRemaining(item.dueDate);
            const isLate = days !== null && days < 0;
            const isSoon = days !== null && days >= 0 && days <= 3;
            return (
              <li key={`${item.type}-${item.id}`} className="flex items-start gap-3">
                <div
                  className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    isLate
                      ? "bg-rose-50 text-rose-600"
                      : isSoon
                      ? "bg-amber-50 text-amber-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isLate ? `${Math.abs(days)}d` : `${days ?? "—"}d`}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">{item.label}</p>
                    {item.type === "Task" && <ClipboardList size={12} className="text-slate-300 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{item.client}</p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock size={10} /> {formatDate(item.dueDate)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!loading && shown.length === 0 ? null : (
        <Link
          href="/compliance"
          className="mt-5 block text-center text-[13px] font-medium text-brand-700 border border-slate-200 rounded-xl py-2.5 hover:bg-brand-50 hover:border-brand-200 transition-colors"
        >
          View all deadlines <ArrowRight size={12} className="inline" />
        </Link>
      )}

      <DueCalendarModal open={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </div>
  );
}
