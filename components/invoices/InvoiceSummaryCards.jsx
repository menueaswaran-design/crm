"use client";

import { TrendingUp, Wallet, AlertTriangle, ArrowUpRight } from "lucide-react";
import { formatINR } from "@/lib/utils";

export default function InvoiceSummaryCards({ totals, loading }) {
  const cards = [
    {
      label: "Total Revenue",
      value: loading ? "…" : formatINR(totals?.totalRevenue ?? 0),
      icon: TrendingUp,
      tile: "bg-emerald-50 text-emerald-600 border border-emerald-100",
      sub: "Total billed",
    },
    {
      label: "Amount Received",
      value: loading ? "…" : formatINR(totals?.amountReceived ?? 0),
      icon: Wallet,
      tile: "bg-emerald-50 text-emerald-600 border border-emerald-100",
      sub: "Collected",
    },
    {
      label: "Outstanding",
      value: loading ? "…" : formatINR(totals?.outstanding ?? 0),
      icon: AlertTriangle,
      tile: "bg-rose-50 text-rose-600 border border-rose-100",
      sub: "To collect",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card card-hover flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${c.tile}`}
          >
            <c.icon size={20} />
          </div>
          <div className="min-w-0">
            <p className="eyebrow">{c.label}</p>
            <p className="num mt-1 truncate text-lg font-semibold tracking-[-0.02em] text-slate-900 sm:text-xl">
              {c.value}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <ArrowUpRight size={11} /> {c.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
