"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Upload,
  MessageSquare,
  ArrowUpRight,
  FolderOpen,
} from "lucide-react";
import { CategoryBadge } from "@/components/common/Badge";
import DocumentRow from "@/components/documents/DocumentRow";
import WhatsAppMessageModal from "@/components/whatsapp/WhatsAppMessageModal";
import { generateClientMessage } from "@/lib/whatsappMessages";
import { assignedStaffNames } from "@/lib/clientAssignment";
import { formatBytes, formatDate } from "@/lib/utils";

const PREVIEW_COUNT = 5;

function initials(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * One client with all of their documents nested underneath.
 *
 * Everything below the header is already loaded by /api/documents/grouped, so
 * expanding a client is instant and never paginates a client's files apart.
 */
export default function ClientDocumentCard({ group, onDelete, onUpload }) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  const documents = group.documents || [];
  const total = group.totalDocuments || documents.length;
  const visible = showAll ? documents : documents.slice(0, PREVIEW_COUNT);
  const hidden = total - visible.length;

  const categorySummary = useMemo(() => {
    const entries = Object.entries(group.categoryCounts || {}).sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 4);
  }, [group.categoryCounts]);

  const stop = (fn) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    fn();
  };

  const client = {
    _id: group._id,
    name: group.name,
    clientCode: group.clientCode,
    phone: group.phone,
    category: group.category,
    assignedStaff: group.staff || [],
  };

  return (
    <div className="card card-hover overflow-hidden animate-fade-in-up">
      <div
        className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 p-4 transition-colors hover:bg-canvas/50 sm:p-5"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hairline bg-canvas text-xs font-semibold text-slate-600 sm:h-10 sm:w-10 sm:text-sm">
            {initials(group.name)}
          </span>

          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-semibold tracking-[-0.011em] text-slate-900 sm:text-base">
                {group.name}
              </span>
              {group.gstin && (
                <span className="hidden truncate font-mono text-[10px] text-slate-400 sm:inline">
                  {group.gstin}
                </span>
              )}
            </span>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-md border border-hairline bg-canvas px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500">
                {group.clientCode || "—"}
              </span>
              <CategoryBadge category={group.category} />
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50/70 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                {total} file{total === 1 ? "" : "s"}
              </span>
              <span className="hidden text-[11px] text-slate-400 sm:inline">
                {formatBytes(group.sizeBytes)} · {formatDate(group.lastUploadedAt)}
              </span>
            </span>
          </span>
        </span>

        <span className="flex items-center gap-1 sm:gap-0.5 shrink-0 ml-auto">
          <button
            type="button"
            onClick={stop(() => onUpload?.(group))}
            disabled={!onUpload}
            className="p-2 sm:p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            aria-label={`Upload files for ${group.name}`}
            title={`Upload files for ${group.name}`}
          >
            <Upload size={15} />
          </button>
          {group.phone && (
            <button
              type="button"
              onClick={stop(() => setWhatsappOpen(true))}
              className="p-2 sm:p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              aria-label={`WhatsApp ${group.name}`}
              title={`WhatsApp ${group.name}`}
            >
              <MessageSquare size={15} />
            </button>
          )}
          <Link
            href={`/clients/${group._id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-2 sm:p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            aria-label={`Open client ${group.name}`}
            title="Open client"
          >
            <ArrowUpRight size={15} />
          </Link>
          <button
            type="button"
            onClick={stop(() => setExpanded((v) => !v))}
            className="ml-1 p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label={expanded ? `Collapse ${group.name}` : `Expand ${group.name}`}
            aria-expanded={expanded}
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </span>
      </div>

      {expanded && (
        <div className="border-t border-hairline bg-canvas/40">
          {categorySummary.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3 sm:px-5">
              <FolderOpen size={12} className="text-slate-400" />
              {categorySummary.map(([cat, count]) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 rounded-md border border-hairline bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
                >
                  {cat}
                  <span className="font-semibold text-slate-700">{count}</span>
                </span>
              ))}
            </div>
          )}

          <ul className="divide-y divide-hairline/70 px-4 sm:px-5">
            {visible.map((doc) => (
              <li key={doc._id}>
                <DocumentRow doc={doc} onDelete={onDelete} />
              </li>
            ))}
          </ul>

          <div className="px-4 sm:px-5 pb-4 pt-1 flex flex-wrap items-center justify-between gap-2">
            {hidden > 0 || showAll ? (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800 transition-colors"
              >
                {showAll ? (
                  <>
                    <ChevronDown size={13} className="rotate-180" /> Show fewer
                  </>
                ) : (
                  <>
                    <ChevronRight size={13} /> Show all {total} files
                  </>
                )}
              </button>
            ) : (
              <span />
            )}
            <span className="text-[11px] text-slate-400">
              Staff: {assignedStaffNames(group.staff)}
            </span>
          </div>

          {group.truncated && (
            <p className="px-4 sm:px-5 pb-4 text-[11px] text-amber-600">
              Showing the {documents.length} most recent files. Open the client for the full history.
            </p>
          )}
        </div>
      )}

      <WhatsAppMessageModal
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        client={client}
        initialMessage={generateClientMessage({ client })}
        clientId={group._id}
        messageType="CLIENT_MESSAGE"
      />
    </div>
  );
}