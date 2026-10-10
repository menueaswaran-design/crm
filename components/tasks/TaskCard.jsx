"use client";

import { useState } from "react";
import { CalendarDays, User, Building2, CheckCircle2, PlayCircle, Trash2, Pencil, MessageSquare } from "lucide-react";
import { StatusBadge, PriorityBadge, CategoryBadge } from "@/components/common/Badge";
import Button from "@/components/common/Button";
import WhatsAppButton from "@/components/whatsapp/WhatsAppButton";
import { patchData } from "@/lib/client";
import { formatDate, daysRemaining } from "@/lib/utils";
import { generateTaskReminderMessage } from "@/lib/whatsappMessages";

export default function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  const derivedStatus = task.derivedStatus || task.status;
  const days = daysRemaining(task.dueDate);
  const isLate = days !== null && days !== undefined && days < 0;
  const isSoon = days !== null && days !== undefined && days >= 0 && days <= 3;
  const unassigned = !task.assignedTo;

  const changeStatus = async (status) => {
    setUpdating(true);
    try {
      await patchData(`/api/tasks/${task._id}`, { status });
      onStatusChange && onStatusChange();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="card card-interactive flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug tracking-[-0.011em] text-slate-900 sm:text-base">
          {task.title}
        </h3>
        <div className="flex shrink-0 gap-0.5">
          {onEdit && (
            <button onClick={() => onEdit(task)} className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:p-1.5" aria-label="Edit">
              <Pencil size={15} />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(task)} className="rounded-md p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 sm:p-1.5" aria-label="Delete">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={derivedStatus} />
        <PriorityBadge priority={task.priority} />
        {unassigned && <CategoryBadge category="Unassigned" />}
      </div>

      <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
        {task.description}
      </p>

      <div className="mt-3.5 space-y-2 text-xs text-slate-600 sm:text-[13px]">
        <p className="flex items-center gap-2 truncate">
          <Building2 size={14} className="shrink-0 text-slate-400" />
          <span className="truncate">{task.clientId?.name || "—"}</span>
        </p>
        <p className="flex items-center gap-2">
          <User size={14} className="shrink-0 text-slate-400" />
          {unassigned ? (
            <span className="font-medium text-amber-700">Unassigned</span>
          ) : (
            task.assignedTo?.name
          )}
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays size={14} className="shrink-0 text-slate-400" />
          <span className={isLate ? "font-medium text-rose-600" : isSoon ? "font-medium text-amber-600" : ""}>
            {formatDate(task.dueDate)}
          </span>
        </p>
      </div>

      {derivedStatus !== "COMPLETED" && (
        <div className="mt-3.5 flex flex-wrap gap-2 border-t border-hairline pt-3">
          {derivedStatus === "PENDING" && (
            <Button size="sm" variant="secondary" onClick={() => changeStatus("IN_PROGRESS")} disabled={updating}>
              <PlayCircle size={14} /> Start
            </Button>
          )}
          <Button size="sm" variant="success" onClick={() => changeStatus("COMPLETED")} disabled={updating}>
            <CheckCircle2 size={14} /> Complete
          </Button>
          {task.clientId?.phone && (
            <WhatsAppButton
              phone={task.clientId.phone}
              client={task.clientId}
              clientId={task.clientId._id}
              message={generateTaskReminderMessage({ client: task.clientId, task })}
              label="WhatsApp"
              messageType="TASK_REMINDER"
              variant="secondary"
              size="sm"
            />
          )}
        </div>
      )}
    </div>
  );
}
