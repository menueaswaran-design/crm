"use client";

import { useState } from "react";
import { CalendarDays, User, PlayCircle, CheckCircle2, Pencil, Trash2, Flag } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/common/Badge";
import Button from "@/components/common/Button";
import { patchData } from "@/lib/client";
import { formatDate, daysRemaining } from "@/lib/utils";

export default function ComplianceCard({ record, onEdit, onDelete, onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  const days = daysRemaining(record.dueDate);

  const changeStatus = async (status) => {
    setUpdating(true);
    try {
      await patchData(`/api/compliance/${record._id}`, { status });
      onStatusChange && onStatusChange();
    } finally {
      setUpdating(false);
    }
  };

  const isLate = days !== null && days < 0;
  const isSoon = days !== null && days >= 0 && days <= 3;

  return (
    <div className="card p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${
            isLate ? "bg-rose-50 text-rose-600" : isSoon ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
          }`}>
            {days !== null ? `${days}d` : "—"}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 leading-snug truncate">
              {record.clientId?.name || "Client"}
            </h3>
            <p className="text-xs text-slate-400 truncate">{record.type}</p>
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0">
          {onEdit && (
            <button onClick={() => onEdit(record)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-brand-50 transition-colors" aria-label="Edit">
              <Pencil size={15} />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(record)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" aria-label="Delete">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        <StatusBadge status={record.status} />
        <PriorityBadge priority={record.priority} />
      </div>

      <div className="mt-4 space-y-2 text-[13px] text-slate-600">
        <p className="flex items-center gap-2">
          <CalendarDays size={14} className="text-slate-300 shrink-0" />
          <span className="font-medium text-slate-700">Due:</span>
          <span className={isLate ? "text-rose-600 font-semibold" : isSoon ? "text-amber-600 font-semibold" : ""}>
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

      {record.status !== "COMPLETED" && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
          {record.status === "PENDING" && (
            <Button size="sm" variant="secondary" onClick={() => changeStatus("IN_PROGRESS")} disabled={updating}>
              <PlayCircle size={14} /> Start
            </Button>
          )}
          <Button size="sm" variant="success" onClick={() => changeStatus("COMPLETED")} disabled={updating}>
            <CheckCircle2 size={14} /> Complete
          </Button>
        </div>
      )}
    </div>
  );
}
