import { Inbox, Search, FileQuestion, AlertCircle } from "lucide-react";

const VARIANTS = {
  default: {
    Icon: Inbox,
    iconWrap: "bg-slate-50 text-slate-400 border-hairline/80",
  },
  search: {
    Icon: Search,
    iconWrap: "bg-brand-50/60 text-brand-500 border-brand-100",
  },
  unavailable: {
    Icon: FileQuestion,
    iconWrap: "bg-amber-50/70 text-amber-600 border-amber-100",
  },
  error: {
    Icon: AlertCircle,
    iconWrap: "bg-rose-50/70 text-rose-500 border-rose-100",
  },
};

export default function EmptyState({
  title = "Nothing here yet",
  description,
  action,
  variant = "default",
  icon,
  compact = false,
  className = "",
}) {
  const preset = VARIANTS[variant] || VARIANTS.default;
  const Icon = icon || preset.Icon;

  if (compact) {
    return (
      <div
        className={`rounded-xl border border-dashed border-hairline-strong bg-canvas/60 px-4 py-8 text-center ${className}`}
      >
        <div
          className={`mx-auto flex h-9 w-9 items-center justify-center rounded-lg border ${preset.iconWrap}`}
        >
          <Icon size={16} />
        </div>
        <p className="mt-2.5 text-[13px] font-medium text-slate-700">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        )}
        {action && <div className="mt-3.5">{action}</div>}
      </div>
    );
  }

  return (
    <div
      className={`animate-fade-in flex flex-col items-center justify-center py-16 text-center ${className}`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl border ${preset.iconWrap}`}
      >
        <Icon size={22} />
      </div>
      <h3 className="mt-4 text-sm font-semibold tracking-[-0.011em] text-slate-900">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-500">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
