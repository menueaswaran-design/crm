import { Inbox } from "lucide-react";

export default function EmptyState({ title = "Nothing here yet", description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400">
          <Inbox size={28} />
        </div>
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-brand-100/40 to-transparent -z-10" />
      </div>
      <h3 className="mt-5 text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-slate-500 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
