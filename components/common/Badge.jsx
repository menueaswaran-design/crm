import { STATUS_COLORS, PRIORITY_COLORS } from "@/lib/utils";

const styles = {
  yellow: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  blue: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  red: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
  gray: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/15",
  slate: "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/15",
  indigo: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/20",
  orange: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20",
};

const dots = {
  yellow: "bg-amber-500",
  blue: "bg-sky-500",
  green: "bg-emerald-500",
  red: "bg-rose-500",
  gray: "bg-slate-400",
  slate: "bg-slate-400",
  indigo: "bg-brand-500",
  orange: "bg-orange-500",
};

export default function Badge({ label, color, className = "", dot = false }) {
  const resolved = color || stylesFromLabel(label);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[resolved] || styles.gray} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dots[resolved] || dots.gray}`} />}
      {label}
    </span>
  );
}

export function StatusBadge({ status }) {
  const key = String(status || "").toUpperCase();
  const colors = { ...STATUS_COLORS, PENDING: "yellow", IN_PROGRESS: "blue", COMPLETED: "green", OVERDUE: "red", PAID: "green", PARTIAL: "blue", ACTIVE: "green", INACTIVE: "gray" };
  return <Badge label={key.replace(/_/g, " ")} color={colors[key]} dot />;
}

export function PriorityBadge({ priority }) {
  const key = String(priority || "").toUpperCase();
  const colors = PRIORITY_COLORS;
  return <Badge label={key} color={colors[key]} dot />;
}

export function CategoryBadge({ category, label }) {
  const text = category || label;
  const isUnassigned = String(text || "").toLowerCase() === "unassigned";
  return <Badge label={text} color={isUnassigned ? "orange" : "slate"} />;
}

function stylesFromLabel(label) {
  const l = String(label || "").toLowerCase();
  if (l.includes("pending")) return "yellow";
  if (l.includes("progress")) return "blue";
  if (l.includes("complete") || l.includes("paid") || l.includes("active")) return "green";
  if (l.includes("overdue")) return "red";
  if (l.includes("inactive")) return "gray";
  if (l.includes("partial")) return "blue";
  return "gray";
}
