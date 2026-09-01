import { Inbox, Search, FileQuestion, AlertCircle } from "lucide-react";

const VARIANTS = {
  default: {
    Icon: Inbox,
    iconWrap: "from-slate-100 to-slate-200 text-slate-400",
    ring: "from-brand-100/40",
  },
  search: {
    Icon: Search,
    iconWrap: "from-indigo-50 to-indigo-100 text-indigo-500",
    ring: "from-indigo-100/50",
  },
  unavailable: {
    Icon: FileQuestion,
    iconWrap: "from-amber-50 to-amber-100 text-amber-600",
    ring: "from-amber-100/40",
  },
  error: {
    Icon: AlertCircle,
    iconWrap: "from-rose-50 to-rose-100 text-rose-500",
    ring: "from-rose-100/40",
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
      <div className={`rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center ${className}`}>
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
          <Icon size={18} />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
        {description && <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">{description}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center animate-fade-in ${className}`}>
      <div className="relative">
        <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${preset.iconWrap} flex items-center justify-center`}>
          <Icon size={28} />
        </div>
        <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-br ${preset.ring} to-transparent -z-10`} />
      </div>
      <h3 className="mt-5 text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-slate-500 max-w-md">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
