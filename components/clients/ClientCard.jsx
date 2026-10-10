"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2, Mail, Phone, IdCard, Building2, ArrowUpRight, MessageSquare } from "lucide-react";
import { CategoryBadge } from "@/components/common/Badge";
import WhatsAppMessageModal from "@/components/whatsapp/WhatsAppMessageModal";
import AssignStaffModal from "@/components/clients/AssignStaffModal";
import { generateClientMessage } from "@/lib/whatsappMessages";
import { assignedStaffIds, assignedStaffNames } from "@/lib/clientAssignment";

function initials(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function ClientCard({ client, onEdit, onDelete, onAssigned }) {
  const unassigned = assignedStaffIds(client.assignedStaff).length === 0;
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const handleWhatsApp = () => {
    setWhatsappOpen(true);
  };

  return (
    <>
    <div className="card card-interactive flex flex-col p-4">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hairline bg-canvas text-xs font-semibold text-slate-600 sm:h-10 sm:w-10 sm:text-sm">
            {initials(client.name)}
          </div>
          <div className="min-w-0">
            <Link href={`/clients/${client._id}`} className="group block">
              <h3 className="truncate text-sm font-semibold tracking-[-0.011em] text-slate-900 transition-colors group-hover:text-brand-700 sm:text-base">
                {client.name}
              </h3>
            </Link>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-md border border-hairline bg-canvas px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500">
                {client.clientCode || "—"}
              </span>
              <CategoryBadge category={client.category} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {client.phone && (
            <button
              onClick={handleWhatsApp}
              className="rounded-md p-2 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 sm:p-1.5"
              aria-label="WhatsApp client"
              title="WhatsApp client"
            >
              <MessageSquare size={15} />
            </button>
          )}
          <button
            onClick={() => onEdit(client)}
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:p-1.5"
            aria-label="Edit client"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(client)}
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 sm:p-1.5"
            aria-label="Delete client"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="mt-3.5 grid gap-2 text-xs text-slate-600 sm:text-[13px]">
        <p className="flex items-center gap-2 truncate">
          <IdCard size={14} className="shrink-0 text-slate-400" />
          <span className="font-mono text-slate-500">{client.pan || "—"}</span>
        </p>
        {client.gstin && (
          <p className="flex items-center gap-2 truncate">
            <Building2 size={14} className="shrink-0 text-slate-400" />
            <span className="truncate font-mono text-slate-500">{client.gstin}</span>
          </p>
        )}
        <p className="flex items-center gap-2 truncate">
          <Mail size={14} className="shrink-0 text-slate-400" />
          <span className="truncate">{client.email || "—"}</span>
        </p>
        <p className="flex items-center gap-2">
          <Phone size={14} className="shrink-0 text-slate-400" />
          {client.phone || "—"}
        </p>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-hairline pt-3">
        <p className="truncate text-xs text-slate-500">
          {unassigned ? (
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className="cursor-pointer font-medium text-amber-700 transition-colors hover:text-amber-800 hover:underline"
              title="Assign staff"
            >
              Unassigned
            </button>
          ) : (
            <>
              Staff:{" "}
              <span className="font-medium text-slate-700">
                {assignedStaffNames(client.assignedStaff)}
              </span>
            </>
          )}
        </p>
        <Link
          href={`/clients/${client._id}`}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-700 transition-colors hover:text-brand-800"
        >
          View <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>

    <WhatsAppMessageModal
      open={whatsappOpen}
      onClose={() => setWhatsappOpen(false)}
      client={client}
      initialMessage={generateClientMessage({ client })}
      clientId={client._id}
      messageType="CLIENT_MESSAGE"
    />

    <AssignStaffModal
      open={assignOpen}
      onClose={() => setAssignOpen(false)}
      client={client}
      onAssigned={onAssigned}
    />
    </>
  );
}
