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
    <div className="card p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 leading-snug text-sm sm:text-base">{task.title}</h3>
        <div className="flex gap-0.5 shrink-0">
          {onEdit && (
            <button onClick={() => onEdit(task)} className="p-2 sm:p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" aria-label="Edit">
              <Pencil size={15} />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(task)} className="p-2 sm:p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" aria-label="Delete">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        <StatusBadge status={derivedStatus} />
        <PriorityBadge priority={task.priority} />
        {unassigned && <CategoryBadge category="Unassigned" />}
      </div>

      <p className="mt-2.5 text-xs sm:text-sm text-slate-600 line-clamp-2">{task.description}</p>

      <div className="mt-3 space-y-1.5 text-xs sm:text-[13px] text-slate-600">
        <p className="flex items-center gap-2 truncate">
          <Building2 size={14} className="text-slate-400 shrink-0" />
          <span className="truncate">{task.clientId?.name || "—"}</span>
        </p>
        <p className="flex items-center gap-2">
          <User size={14} className="text-slate-400 shrink-0" />
          {unassigned ? (
            <span className="font-medium text-amber-700">Unassigned</span>
          ) : (
            task.assignedTo?.name
          )}
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays size={14} className="text-slate-400 shrink-0" />
          <span className={isLate ? "text-rose-600 font-medium" : isSoon ? "text-amber-600 font-medium" : ""}>
            {formatDate(task.dueDate)}
          </span>
        </p>
      </div>

      {derivedStatus !== "COMPLETED" && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
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
