"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import Modal from "@/components/common/Modal";
import { getList } from "@/lib/client";
import { formatDate } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DueCalendarModal({ open, onClose }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [{ data }, overdueRes] = await Promise.all([
          getList("/api/compliance?upcoming=1&limit=100"),
          fetch("/api/compliance?status=OVERDUE&limit=100").then((r) => r.json()).catch(() => ({ data: [] })),
        ]);
        if (!alive) return;
        setRecords([...(data || []), ...(overdueRes.data || [])]);
      } catch {
        // ignore
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const r of records) {
      const d = new Date(r.dueDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return map;
  }, [records]);

  const monthRecords = useMemo(
    () =>
      records
        .filter((r) => {
          const d = new Date(r.dueDate);
          return d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear();
        })
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)),
    [records, cursor]
  );

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const lead = first.getDay();
    const arr = Array.from({ length: lead }, () => null);
    for (let i = 1; i <= daysInMonth; i++) arr.push(new Date(cursor.getFullYear(), cursor.getMonth(), i));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  const today = new Date();
  const selectedKey = selected ? `${selected.getFullYear()}-${selected.getMonth()}-${selected.getDate()}` : null;
  const dayRecords = selectedKey ? byDay.get(selectedKey) || [] : null;

  const moveMonth = (delta) => {
    setSelected(null);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Due dates calendar"
      description="All pending filings by month"
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Calendar grid */}
        <div className="sm:w-64 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => moveMonth(-1)}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold text-slate-900">
              {MONTH_LABELS[cursor.getMonth()]} {cursor.getFullYear()}
            </p>
            <button
              onClick={() => moveMonth(1)}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAYS.map((w, i) => (
              <span key={`${w}-${i}`} className="text-[10px] font-medium uppercase text-slate-300 py-1">{w}</span>
            ))}
            {cells.map((date, i) => {
              if (!date) return <span key={`blank-${i}`} />;
              const isToday = sameDay(date, today);
              const items = byDay.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`) || [];
              const hasDue = items.length > 0;
              const isSelected = selected && sameDay(date, selected);
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => hasDue && setSelected(isSelected ? null : date)}
                  disabled={!hasDue}
                  className={`relative mx-auto h-8 w-8 rounded-lg text-xs flex flex-col items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-indigo-600 text-white font-bold"
                      : hasDue
                      ? "bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 cursor-pointer"
                      : "text-slate-500 hover:bg-slate-50 cursor-default"
                  }`}
                >
                  {date.getDate()}
                  {isToday && !isSelected && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-indigo-500" />}
                  {hasDue && !isSelected && (
                    <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-white ${
                      items.some((r) => r.status === "OVERDUE") ? "bg-rose-500" : "bg-emerald-500"
                    }`} />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> due</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> overdue</span>
            <span className="flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-indigo-500" /> today</span>
          </div>
        </div>

        {/* Month list */}
        <div className="flex-1 min-w-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
            <CalendarDays size={12} />
            {selected ? formatDate(selected) : `${MONTH_LABELS[cursor.getMonth()]} dues`}
            {!selected && monthRecords.length > 0 && ` (${monthRecords.length})`}
          </p>
          {loading ? (
            <div className="space-y-2 py-4">
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-10 w-full" />
            </div>
          ) : dayRecords ? (
            dayRecords.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Nothing due on this day</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {dayRecords.map((r) => (
                  <li key={r._id} className="py-2.5 flex items-center gap-3">
                    <span className={`h-7 min-w-11 px-1.5 rounded-md text-[11px] font-bold flex items-center justify-center ${
                      r.status === "OVERDUE" ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"
                    }`}>
                      {formatDate(r.dueDate).slice(0, 6)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{r.clientId?.name || "Client"}</p>
                      <p className="text-xs text-slate-400">{r.type}{r.financialYear ? ` · FY ${r.financialYear}` : ""}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : monthRecords.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No filings due this month</p>
          ) : (
            <ul className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
              {monthRecords.map((r) => {
                const overdue = r.status === "OVERDUE";
                return (
                  <li key={r._id} className="py-2.5 flex items-center gap-3">
                    <span className={`h-7 min-w-11 px-1.5 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 ${
                      overdue ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"
                    }`}>
                      {formatDate(r.dueDate).slice(0, 6)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{r.clientId?.name || "Client"}</p>
                      <p className="text-xs text-slate-400 truncate">{r.type}{r.financialYear ? ` · FY ${r.financialYear}` : ""}</p>
                    </div>
                    {overdue && (
                      <span className="shrink-0 text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 bg-rose-50 text-rose-600">Late</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
