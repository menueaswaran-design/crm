"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200/80 bg-rose-50/70 px-4 py-3">
      <p className="text-[13px] leading-relaxed text-rose-800 flex items-center gap-2 min-w-0">
        <AlertTriangle size={15} className="shrink-0 mt-px text-rose-500" />
        <span className="break-words">{message || "Something went wrong."}</span>
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-rose-50 transition-colors"
        >
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}