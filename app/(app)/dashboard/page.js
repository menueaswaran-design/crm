"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  FileCheck2,
  CheckSquare,
  AlertTriangle,
  IndianRupee,
  Wallet,
  TrendingUp,
  FolderOpen,
  ArrowRight,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/client";
import { formatINR, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/common/Badge";
import UpcomingDeadlinesCard from "@/components/dashboard/UpcomingDeadlinesCard";

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [activity, setActivity] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [s, r, a, u] = await Promise.all([
          apiFetch("/api/dashboard/summary"),
          apiFetch("/api/dashboard/revenue"),
          apiFetch("/api/dashboard/activity"),
          apiFetch("/api/dashboard/upcoming"),
        ]);
        setSummary(s.data);
        setRevenue(r.data || []);
        setActivity(a.data || []);
        setUpcoming(u.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-6 w-3/4" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2 space-y-3">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-56 w-full" />
          </div>
          <div className="card p-6 space-y-3">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-56 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Clients",
      value: summary?.totalClients ?? 0,
      icon: Users,
      tile: "from-brand-500 to-brand-700",
      sub: "client records",
    },
    {
      label: "Active Compliance",
      value:
        (summary?.compliance?.PENDING ?? 0) +
        (summary?.compliance?.IN_PROGRESS ?? 0),
      icon: FileCheck2,
      tile: "from-amber-400 to-orange-500",
      sub: "in progress",
    },
    {
      label: "Pending Tasks",
      value:
        (summary?.tasks?.PENDING ?? 0) + (summary?.tasks?.IN_PROGRESS ?? 0),
      icon: CheckSquare,
      tile: "from-sky-400 to-blue-600",
      sub: "in progress",
    },
    {
      label: "Overdue",
      value:
        (summary?.compliance?.OVERDUE ?? 0) + (summary?.tasks?.OVERDUE ?? 0),
      icon: AlertTriangle,
      tile: "from-rose-400 to-rose-600",
      sub: "needs attention",
      alert: (summary?.compliance?.OVERDUE ?? 0) + (summary?.tasks?.OVERDUE ?? 0) > 0,
    },
    {
      label: "Total Revenue",
      value: formatINR(summary?.totalRevenue ?? 0),
      icon: TrendingUp,
      tile: "from-emerald-400 to-teal-600",
      sub: "billed",
    },
    {
      label: "Amount Received",
      value: formatINR(summary?.amountReceived ?? 0),
      icon: Wallet,
      tile: "from-emerald-500 to-green-600",
      sub: "collected",
    },
    {
      label: "Outstanding",
      value: formatINR(summary?.outstandingAmount ?? 0),
      icon: IndianRupee,
      tile: "from-violet-400 to-purple-600",
      sub: "receivable",
    },
    {
      label: "Documents",
      value: summary?.documents ?? 0,
      icon: FolderOpen,
      tile: "from-slate-500 to-slate-700",
      sub: "stored securely",
    },
  ];

  const complianceData = [
    { name: "Pending", value: summary?.compliance?.PENDING ?? 0, color: "#f59e0b" },
    { name: "In Progress", value: summary?.compliance?.IN_PROGRESS ?? 0, color: "#0ea5e9" },
    { name: "Overdue", value: summary?.compliance?.OVERDUE ?? 0, color: "#f43f5e" },
    { name: "Completed", value: summary?.compliance?.COMPLETED ?? 0, color: "#10b981" },
  ];

  const taskData = [
    { name: "Pending", value: summary?.tasks?.PENDING ?? 0, color: "#f59e0b" },
    { name: "In Progress", value: summary?.tasks?.IN_PROGRESS ?? 0, color: "#0ea5e9" },
    { name: "Completed", value: summary?.tasks?.COMPLETED ?? 0, color: "#10b981" },
    { name: "Overdue", value: summary?.tasks?.OVERDUE ?? 0, color: "#f43f5e" },
  ];

  const complianceTotal = complianceData.reduce((s, d) => s + d.value, 0) || 1;
  const taskTotal = taskData.reduce((s, d) => s + d.value, 0) || 1;
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            {greeting}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Practice overview for today
          </p>
        </div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 text-white text-sm font-medium px-3.5 py-2 hover:bg-indigo-700 transition-colors"
        >
          <Users size={15} /> Add client
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`card card-hover p-5 ${s.alert ? "ring-2 ring-rose-200" : ""}`}
          >
            <div className="flex items-start justify-between">
              <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${s.tile} flex items-center justify-center text-white shadow-md`}>
                <s.icon size={20} />
              </div>
              {s.alert && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-rose-50 rounded-full px-2 py-0.5">
                  <AlertTriangle size={10} /> Action needed
                </span>
              )}
            </div>
            <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-slate-400">
              {s.label}
            </p>
            <p className="mt-1 text-xl md:text-2xl font-bold text-slate-900 tracking-tight truncate">
              {s.value}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-900">Revenue Overview</h2>
              <p className="text-xs text-slate-400 mt-0.5">Last 6 months billed revenue</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full px-3 py-1">
              <ArrowUpRight size={13} /> {formatINR(summary?.totalRevenue ?? 0)}
            </div>
          </div>
          {revenue.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: "#94a3b8" }} dy={6} />
                <YAxis axisLine={false} tickLine={false} fontSize={11} tick={{ fill: "#94a3b8" }} tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`} />
                <Tooltip
                  formatter={(value) => [formatINR(value), "Revenue"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e8eaf0", boxShadow: "0 10px 15px -3px rgba(15,23,42,.1)", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 py-16 text-center">No revenue data yet</p>
          )}
        </div>

        {/* Upcoming deadlines */}
        <UpcomingDeadlinesCard items={upcoming} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Compliance breakdown */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-900">Compliance Overview</h2>
              <p className="text-xs text-slate-400 mt-0.5">{complianceTotal} records</p>
            </div>
            <FileCheck2 size={18} className="text-slate-300" />
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 mb-5">
            {complianceData.map((d) =>
              d.value > 0 ? (
                <div key={d.name} style={{ width: `${(d.value / complianceTotal) * 100}%`, background: d.color }} />
              ) : null
            )}
          </div>
          <ul className="space-y-3">
            {complianceData.map((d) => (
              <li key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-sm text-slate-600">{d.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{d.value}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/compliance"
            className="mt-5 flex items-center justify-between text-[13px] font-medium text-brand-700 hover:text-brand-800"
          >
            View compliance <ArrowRight size={14} />
          </Link>
        </div>

        {/* Tasks breakdown */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-900">Task Overview</h2>
              <p className="text-xs text-slate-400 mt-0.5">{taskTotal} tasks</p>
            </div>
            <CheckSquare size={18} className="text-slate-300" />
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 mb-5">
            {taskData.map((d) =>
              d.value > 0 ? (
                <div key={d.name} style={{ width: `${(d.value / taskTotal) * 100}%`, background: d.color }} />
              ) : null
            )}
          </div>
          <ul className="space-y-3">
            {taskData.map((d) => (
              <li key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-sm text-slate-600">{d.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{d.value}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/tasks"
            className="mt-5 flex items-center justify-between text-[13px] font-medium text-brand-700 hover:text-brand-800"
          >
            View tasks <ArrowRight size={14} />
          </Link>
        </div>

        {/* Recent activity */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-900">Recent Activity</h2>
              <p className="text-xs text-slate-400 mt-0.5">Latest actions</p>
            </div>
            <Activity size={18} className="text-slate-300" />
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">No recent activity</p>
          ) : (
            <ul className="space-y-4">
              {activity.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-brand-400 shrink-0 ring-4 ring-brand-50" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-slate-800 leading-snug">{a.description}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {a.actor} · {formatDate(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
