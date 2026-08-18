import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page, totalPages, onChange, total }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 1);
  const end = Math.min(totalPages, start + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-2">
      <p className="text-xs text-slate-500">
        {total !== undefined && (
          <span className="mr-1.5">
            <span className="font-semibold text-slate-700">{total.toLocaleString("en-IN")}</span> records ·
          </span>
        )}
        Page <span className="font-semibold text-slate-700">{page}</span> of {totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-sm"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`h-8 w-8 rounded-lg text-xs font-medium transition-all ${
              p === page
                ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-500/25"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-sm"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
