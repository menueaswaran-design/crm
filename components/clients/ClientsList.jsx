"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2, ArrowUpRight, MessageSquare } from "lucide-react";
import { CategoryBadge } from "@/components/common/Badge";
import WhatsAppMessageModal from "@/components/whatsapp/WhatsAppMessageModal";
import AssignStaffModal from "@/components/clients/AssignStaffModal";
import { generateClientMessage } from "@/lib/whatsappMessages";
import { assignedStaffIds, assignedStaffNames } from "@/lib/clientAssignment";

export default function ClientsList({ clients, onEdit, onDelete, onAssigned }) {
  const [whatsappClient, setWhatsappClient] = useState(null);
  const [assignClient, setAssignClient] = useState(null);

  const handleWhatsApp = (c) => {
    setWhatsappClient(c);
  };

  return (
    <>
    <div className="card divide-y divide-hairline">
      {clients.map((c) => (
        <div key={c._id} className="table-row flex items-center gap-3 px-4 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href={`/clients/${c._id}`}
              className="truncate text-sm font-medium tracking-[-0.008em] text-slate-900 transition-colors hover:text-brand-700"
            >
              {c.name}
            </Link>
            {c.clientCode && (
              <span className="shrink-0 font-mono text-[11px] text-slate-400">{c.clientCode}</span>
            )}
            <CategoryBadge category={c.category} />
            {c.status === "inactive" && (
              <span className="shrink-0 rounded-md border border-hairline bg-canvas px-1.5 py-0.5 text-[11px] text-slate-500">
                Inactive
              </span>
            )}
            <span className="hidden truncate font-mono text-xs text-slate-400 md:inline">
              {c.pan || ""}
            </span>
            <span className="hidden truncate text-xs text-slate-400 lg:inline">{c.email || ""}</span>
          </div>
          <div className="hidden sm:block w-32 text-right text-xs text-slate-500 truncate">
            {assignedStaffIds(c.assignedStaff).length ? (
              <span title={assignedStaffNames(c.assignedStaff)}>
                {assignedStaffNames(c.assignedStaff)}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setAssignClient(c)}
                className="font-medium text-amber-700 hover:underline cursor-pointer"
                title="Assign staff"
              >
                Unassigned
              </button>
            )}
          </div>
          <div className="flex gap-0.5 shrink-0">
            <Link
              href={`/clients/${c._id}`}
              className="p-1.5 rounded-md text-slate-400 hover:text-brand-700 hover:bg-brand-50 transition-colors"
              aria-label="View client"
            >
              <ArrowUpRight size={15} />
            </Link>
            {c.phone && (
              <button
                onClick={() => handleWhatsApp(c)}
                className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                aria-label="WhatsApp client"
                title="WhatsApp client"
              >
                <MessageSquare size={15} />
              </button>
            )}
            <button
              onClick={() => onEdit(c)}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Edit client"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => onDelete(c)}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              aria-label="Delete client"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>

    <WhatsAppMessageModal
      open={!!whatsappClient}
      onClose={() => setWhatsappClient(null)}
      client={whatsappClient}
      initialMessage={whatsappClient ? generateClientMessage({ client: whatsappClient }) : ""}
      clientId={whatsappClient?._id}
      messageType="CLIENT_MESSAGE"
    />

    <AssignStaffModal
      open={!!assignClient}
      onClose={() => setAssignClient(null)}
      client={assignClient}
      onAssigned={onAssigned}
    />
    </>
  );
}
