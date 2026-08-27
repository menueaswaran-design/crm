"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
      <p className="text-sm text-rose-700 flex items-center gap-2 min-w-0">
        <AlertTriangle size={15} className="shrink-0" />
        <span className="break-words">{message || "Something went wrong."}</span>
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-md px-3 py-1.5 transition-colors"
        >
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}