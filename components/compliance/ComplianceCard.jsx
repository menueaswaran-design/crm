"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  User,
  PlayCircle,
  CheckCircle2,
  Pencil,
  Trash2,
  Flag,
  RotateCcw,
  Sparkles,
  FileText,
} from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/common/Badge";
import Button from "@/components/common/Button";
import WhatsAppButton from "@/components/whatsapp/WhatsAppButton";
import { patchData } from "@/lib/client";
import { formatDate, daysRemaining } from "@/lib/utils";
import { generateDocumentRequestMessage } from "@/lib/whatsappMessages";
import {
  buildDocumentChecklist,
  checklistProgress,
  pendingChecklistDocs,
} from "@/lib/documentChecklists";

export default function ComplianceCard({ record, onEdit, onDelete, onStatusChange }) {
  const [status, setStatus] = useState(record.status);
  const [checklist, setChecklist] = useState(record.documentChecklist || []);
  const [updating, setUpdating] = useState(false);
  const [togglingKey, setTogglingKey] = useState("");
  const [error, setError] = useState("");
  const [nextScheduled, setNextScheduled] = useState(null);

  // Sync when switching cards; do not wipe a locally seeded checklist if parent is still empty
  useEffect(() => {
    setStatus(record.status);
    setChecklist(record.documentChecklist || []);
  }, [record._id]);

  useEffect(() => {
    setStatus(record.status);
  }, [record.status]);

  useEffect(() => {
    if (record.documentChecklist?.length) {
      setChecklist(record.documentChecklist);
    }
  }, [record.documentChecklist]);

  const days = daysRemaining(record.dueDate);
  const isLate = days !== null && days < 0;
  const isSoon = days !== null && days >= 0 && days <= 3;
  const isCompleted = status === "COMPLETED";
  const progress = checklistProgress(checklist);
  const pendingDocs = pendingChecklistDocs(checklist);

  const changeStatus = async (next) => {
    if (updating) return;
    setError("");
    setNextScheduled(null);
    const prev = status;
    setStatus(next);
    setUpdating(true);
    try {
      const updated = await patchData(`/api/compliance/${record._id}`, { status: next });
      if (updated?.nextScheduled) setNextScheduled(updated.nextScheduled);
      else setNextScheduled(null);
      if (updated?.documentChecklist?.length) setChecklist(updated.documentChecklist);
      onStatusChange && onStatusChange();
    } catch (err) {
      setStatus(prev);
      setError(err.message || "Could not update. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const ensureChecklist = async () => {
    if (checklist.length) return checklist;
    // Show items immediately, then persist to the server
    const local = buildDocumentChecklist({
      type: record.type,
      category: record.category,
    });
    setChecklist(local);
    const updated = await patchData(`/api/compliance/${record._id}`, { seedChecklist: true });
    const next = updated?.documentChecklist?.length ? updated.documentChecklist : local;
    setChecklist(next);
    onStatusChange && onStatusChange();
    return next;
  };

  const toggleDoc = async (item) => {
    if (togglingKey || isCompleted) return;
    setError("");
    setTogglingKey(item.key || item.name);
    const prev = checklist;
    const nextReceived = !item.received;
    setChecklist((list) =>
      list.map((d) =>
        (d.key || d.name) === (item.key || item.name)
          ? { ...d, received: nextReceived, receivedAt: nextReceived ? new Date().toISOString() : null }
          : d
      )
    );
    try {
      let key = item.key;
      if (!checklist.length) {
        const seeded = await ensureChecklist();
        const match = seeded.find((d) => d.name === item.name || d.key === item.key);
        key = match?.key || item.key || item.name;
      }
      const updated = await patchData(`/api/compliance/${record._id}`, {
        checklistKey: key || item.name,
        received: nextReceived,
      });
      if (updated?.documentChecklist?.length) setChecklist(updated.documentChecklist);
      onStatusChange && onStatusChange();
    } catch (err) {
      setChecklist(prev);
      setError(err.message || "Could not update document status.");
    } finally {
      setTogglingKey("");
    }
  };

  const requestMessage = generateDocumentRequestMessage({
    client: record.clientId,
    documents: pendingDocs.length
      ? pendingDocs
      : checklist.length
        ? [{ name: "All listed documents (if any still pending)" }]
        : [{ name: "Required supporting documents for this filing" }],
    period: record.period || record.financialYear || null,
    filingType: record.type,
  });

  return (
    <div className={`card p-3.5 sm:p-4 flex flex-col transition-opacity ${isCompleted ? "opacity-75" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${
            isCompleted
              ? "bg-emerald-50 text-emerald-600"
              : isLate
              ? "bg-rose-50 text-rose-600"
              : isSoon
              ? "bg-amber-50 text-amber-600"
              : "bg-slate-100 text-slate-500"
          }`}>
            {isCompleted ? <CheckCircle2 size={16} /> : days !== null ? `${days}d` : "—"}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base leading-snug truncate">
              {record.clientId?.name || "Client"}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate flex items-center gap-1">
              {record.type}
              {record.autoGenerated && (
                <span title="Auto-scheduled after the previous filing was completed" className="inline-flex items-center gap-0.5 text-[10px] font-medium text-indigo-500">
                  <Sparkles size={10} /> auto
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0">
          {onEdit && (
            <button onClick={() => onEdit(record)} disabled={updating} className="p-2 sm:p-1.5 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-brand-50 transition-colors disabled:opacity-50" aria-label="Edit">
              <Pencil size={15} />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(record)} disabled={updating} className="p-2 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50" aria-label="Delete">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        <StatusBadge status={status} />
        <PriorityBadge priority={record.priority} />
        {progress.total > 0 && (
          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
            progress.pending === 0
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}>
            <FileText size={10} />
            Docs {progress.received}/{progress.total}
          </span>
        )}
      </div>

      {isCompleted && (
        <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-xs text-emerald-800">
          <p className="font-semibold flex items-center gap-1.5">
            <CheckCircle2 size={13} /> Filing completed{record.completedAt ? ` on ${formatDate(record.completedAt)}` : ""}
          </p>
          {nextScheduled ? (
            <p className="mt-0.5 text-emerald-700">Next occurrence scheduled for {formatDate(nextScheduled)}.</p>
          ) : record.recurrence && record.recurrence !== "NONE" ? (
            <p className="mt-0.5 text-emerald-700">Next occurrence already on your list.</p>
          ) : null}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-3 sm:mt-4 space-y-2 text-xs sm:text-[13px] text-slate-600">
        <p className="flex items-center gap-2">
          <CalendarDays size={14} className="text-slate-300 shrink-0" />
          <span className="font-medium text-slate-700">Due:</span>
          <span className={!isCompleted && isLate ? "text-rose-600 font-semibold" : !isCompleted && isSoon ? "text-amber-600 font-semibold" : ""}>
            {formatDate(record.dueDate)}
          </span>
        </p>
        <p className="flex items-center gap-2">
          <Flag size={14} className="text-slate-300 shrink-0" />
          <span className="font-medium text-slate-700">FY:</span> {record.financialYear || "—"}
        </p>
        <p className="flex items-center gap-2">
          <User size={14} className="text-slate-400 shrink-0" />
          {record.assignedStaff?.name ? (
            record.assignedStaff.name
          ) : (
            <span className="font-medium text-amber-700">Unassigned</span>
          )}
        </p>
      </div>

      {/* Document checklist */}
      {!isCompleted && (
        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
              <FileText size={12} /> Documents needed
            </p>
            {progress.total > 0 && (
              <span className="text-[11px] text-slate-400">
                {progress.pending} pending
              </span>
            )}
          </div>

          {checklist.length === 0 ? (
            <button
              type="button"
              onClick={async () => {
                try {
                  setUpdating(true);
                  await ensureChecklist();
                } catch (err) {
                  setError(err.message || "Could not load checklist.");
                } finally {
                  setUpdating(false);
                }
              }}
              className="text-xs font-medium text-indigo-600 hover:underline"
              disabled={updating}
            >
              Load document checklist
            </button>
          ) : (
            <ul className="space-y-1.5">
              {checklist.map((item) => {
                const id = item.key || item.name;
                const busy = togglingKey === id;
                return (
                  <li key={id}>
                    <label className={`flex items-start gap-2 text-xs cursor-pointer ${busy ? "opacity-60" : ""}`}>
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        checked={!!item.received}
                        disabled={busy || updating}
                        onChange={() => toggleDoc(item)}
                      />
                      <span className={item.received ? "text-slate-400 line-through" : "text-slate-700"}>
                        {item.name}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {!isCompleted && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100 flex flex-wrap gap-2">
          {status === "PENDING" && (
            <Button size="sm" variant="secondary" onClick={() => changeStatus("IN_PROGRESS")} loading={updating}>
              <PlayCircle size={14} /> Start
            </Button>
          )}
          {status === "IN_PROGRESS" && (
            <Button size="sm" variant="secondary" onClick={() => changeStatus("PENDING")} loading={updating}>
              <RotateCcw size={13} /> Reset
            </Button>
          )}
          <Button size="sm" variant="success" onClick={() => changeStatus("COMPLETED")} loading={updating}>
            <CheckCircle2 size={14} /> Complete
          </Button>
          {record.clientId?.phone && (
            <WhatsAppButton
              phone={record.clientId.phone}
              client={record.clientId}
              clientId={record.clientId._id}
              message={requestMessage}
              label={
                pendingDocs.length
                  ? `Request ${pendingDocs.length} pending doc${pendingDocs.length === 1 ? "" : "s"}`
                  : "Request docs"
              }
              messageType="DOCUMENT_REQUEST"
              iconOnly
            />
          )}
        </div>
      )}

      {isCompleted && onStatusChange && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => changeStatus("IN_PROGRESS")}
            loading={updating}
            className="text-slate-500"
          >
            <RotateCcw size={13} /> Undo (mark in progress)
          </Button>
        </div>
      )}
    </div>
  );
}
