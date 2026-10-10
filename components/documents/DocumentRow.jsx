"use client";

import { FileText, Download, Eye, Trash2, File, FolderOpen } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

export const FILE_ICONS = {
  pdf: { cls: "bg-rose-50 text-rose-600 border border-rose-100", icon: FileText },
  xlsx: { cls: "bg-emerald-50 text-emerald-600 border border-emerald-100", icon: File },
  xls: { cls: "bg-emerald-50 text-emerald-600 border border-emerald-100", icon: File },
  docx: { cls: "bg-sky-50 text-sky-600 border border-sky-100", icon: FileText },
  jpg: { cls: "bg-violet-50 text-violet-600 border border-violet-100", icon: File },
  jpeg: { cls: "bg-violet-50 text-violet-600 border border-violet-100", icon: File },
  png: { cls: "bg-violet-50 text-violet-600 border border-violet-100", icon: File },
};

export const fileIconMeta = (format) =>
  FILE_ICONS[(format || "").toLowerCase()] || {
    cls: "bg-slate-100 text-slate-600 border border-hairline",
    icon: File,
  };

/**
 * One document rendered as a compact row — shared by the client detail page and
 * the client-grouped card on /documents so both stay identical.
 */
export default function DocumentRow({ doc, onDelete, showClient = false }) {
  const meta = fileIconMeta(doc.format);
  const Icon = meta.icon;
  const uploadedAt = formatDate(doc.uploadedAt || doc.createdAt);

  return (
    <div className="table-row -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${meta.cls}`}
      >
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium leading-snug tracking-[-0.008em] text-slate-900">
          {doc.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-canvas px-2 py-0.5 text-[11px] font-medium text-slate-600">
            <FolderOpen size={11} /> {doc.category}
          </span>
          <span className="inline-flex items-center rounded-full border border-brand-100 bg-brand-50/70 px-2 py-0.5 text-[11px] font-medium uppercase text-brand-700">
            {doc.format || "file"}
          </span>
          {showClient && doc.clientId?.name && (
            <span className="truncate text-[11px] font-medium text-slate-500">{doc.clientId.name}</span>
          )}
          <span className="num text-xs text-slate-400">
            {formatBytes(doc.size)} · {uploadedAt}
            {doc.uploadedBy?.name ? ` · ${doc.uploadedBy.name}` : ""}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => window.open(`/api/documents/${doc._id}/view`, "_blank")}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
          aria-label={`View ${doc.name}`}
          title="View"
        >
          <Eye size={15} />
        </button>
        <button
          type="button"
          onClick={() => window.open(`/api/documents/${doc._id}/download`, "_blank")}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
          aria-label={`Download ${doc.name}`}
          title="Download"
        >
          <Download size={15} />
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(doc)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            aria-label={`Delete ${doc.name}`}
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}