import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page, totalPages, onChange, total }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 1);
  const end = Math.min(totalPages, start + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
      <p className="text-xs text-slate-500 num">
        {total !== undefined && (
          <span className="mr-1.5">
            <span className="font-semibold text-slate-700">
              {total.toLocaleString("en-IN")}
            </span>{" "}
            records ·
          </span>
        )}
        Page <span className="font-semibold text-slate-700">{page}</span> of {totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
          className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-slate-50 hover:text-slate-900 hover:border-hairline-strong disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            className={`h-8 w-8 rounded-lg text-xs font-medium transition-all num ${
              p === page
                ? "bg-brand-600 text-white shadow-[0_1px_2px_rgba(79,70,229,0.28)]"
                : "border border-hairline bg-white text-slate-600 hover:bg-slate-50 hover:border-hairline-strong"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
          className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-slate-50 hover:text-slate-900 hover:border-hairline-strong disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
