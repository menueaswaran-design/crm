"use client";

import { useState } from "react";
import { FileText, Download, Trash2, File, FolderOpen } from "lucide-react";
import Button from "@/components/common/Button";
import { formatBytes, formatDate } from "@/lib/utils";

const FILE_ICONS = {
  pdf: { cls: "bg-rose-50 text-rose-600", icon: FileText },
  xlsx: { cls: "bg-emerald-50 text-emerald-600", icon: File },
  xls: { cls: "bg-emerald-50 text-emerald-600", icon: File },
  docx: { cls: "bg-sky-50 text-sky-600", icon: FileText },
  jpg: { cls: "bg-purple-50 text-purple-600", icon: File },
  jpeg: { cls: "bg-purple-50 text-purple-600", icon: File },
  png: { cls: "bg-purple-50 text-purple-600", icon: File },
};

export default function DocumentCard({ doc, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const format = (doc.format || "").toLowerCase();
  const meta = FILE_ICONS[format] || { cls: "bg-slate-100 text-slate-600", icon: File };
  const Icon = meta.icon;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      onDelete && (await onDelete(doc));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card card-hover p-5 flex flex-col animate-fade-in-up">
      <div className="flex items-start gap-3">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${meta.cls}`}>
          <Icon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 text-sm break-all leading-snug">{doc.name}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              <FolderOpen size={11} /> {doc.category}
            </span>
            <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-brand-700">
              {format || "FILE"}
            </span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
          aria-label="Delete document"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-y-2 text-xs text-slate-500">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Client</p>
          <p className="font-medium text-slate-700 truncate mt-0.5">{doc.clientId?.name || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Size</p>
          <p className="font-medium text-slate-700 mt-0.5">{formatBytes(doc.size)}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Uploaded</p>
          <p className="font-medium text-slate-700 mt-0.5">{formatDate(doc.uploadedAt || doc.createdAt)}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          onClick={() => window.open(`/api/documents/${doc._id}/download`, "_blank")}
        >
          <Download size={14} /> Download
        </Button>
      </div>
    </div>
  );
}
