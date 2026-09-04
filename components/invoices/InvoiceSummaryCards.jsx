"use client";

import { TrendingUp, Wallet, AlertTriangle, ArrowUpRight } from "lucide-react";
import { formatINR } from "@/lib/utils";

export default function InvoiceSummaryCards({ totals, loading }) {
  const cards = [
    {
      label: "Total Revenue",
      value: loading ? "…" : formatINR(totals?.totalRevenue ?? 0),
      icon: TrendingUp,
      tile: "from-emerald-400 to-teal-600",
      sub: "Total billed",
    },
    {
      label: "Amount Received",
      value: loading ? "…" : formatINR(totals?.amountReceived ?? 0),
      icon: Wallet,
      tile: "from-emerald-500 to-green-600",
      sub: "Collected",
    },
    {
      label: "Outstanding",
      value: loading ? "…" : formatINR(totals?.outstanding ?? 0),
      icon: AlertTriangle,
      tile: "from-orange-400 to-rose-500",
      sub: "To collect",
    },
  ];

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="card card-hover p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br ${c.tile} flex items-center justify-center text-white shadow-md shrink-0`}>
            <c.icon size={20} className="sm:hidden" />
            <c.icon size={22} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-slate-400">{c.label}</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 truncate mt-0.5">{c.value}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <ArrowUpRight size={11} /> {c.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
