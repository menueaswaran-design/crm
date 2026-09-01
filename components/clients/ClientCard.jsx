"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2, Mail, Phone, IdCard, Building2, ArrowUpRight, MessageSquare } from "lucide-react";
import { CategoryBadge } from "@/components/common/Badge";
import WhatsAppMessageModal from "@/components/whatsapp/WhatsAppMessageModal";
import { generateClientMessage } from "@/lib/whatsappMessages";

function initials(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function ClientCard({ client, onEdit, onDelete }) {
  const unassigned = !client.assignedStaff;
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  const handleWhatsApp = () => {
    setWhatsappOpen(true);
  };

  return (
    <>
    <div className="card p-4 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-semibold shrink-0">
            {initials(client.name)}
          </div>
          <div className="min-w-0">
            <Link href={`/clients/${client._id}`} className="block group">
              <h3 className="font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                {client.name}
              </h3>
            </Link>
            <div className="mt-1 flex flex-wrap gap-1.5 items-center">
              <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
                {client.clientCode || "—"}
              </span>
              <CategoryBadge category={client.category} />
              {unassigned && <CategoryBadge category="Unassigned" />}
            </div>
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0">
          {client.phone && (
            <button
              onClick={handleWhatsApp}
              className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              aria-label="WhatsApp client"
              title="WhatsApp client"
            >
              <MessageSquare size={15} />
            </button>
          )}
          <button
            onClick={() => onEdit(client)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Edit client"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(client)}
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            aria-label="Delete client"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-1.5 text-[13px] text-slate-600">
        <p className="flex items-center gap-2 truncate">
          <IdCard size={14} className="text-slate-400 shrink-0" />
          <span className="font-mono text-slate-500">{client.pan || "—"}</span>
        </p>
        {client.gstin && (
          <p className="flex items-center gap-2 truncate">
            <Building2 size={14} className="text-slate-400 shrink-0" />
            <span className="font-mono text-slate-500 truncate">{client.gstin}</span>
          </p>
        )}
        <p className="flex items-center gap-2 truncate">
          <Mail size={14} className="text-slate-400 shrink-0" />
          <span className="truncate">{client.email || "—"}</span>
        </p>
        <p className="flex items-center gap-2">
          <Phone size={14} className="text-slate-400 shrink-0" />
          {client.phone || "—"}
        </p>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500 truncate">
          {unassigned ? (
            <span className="font-medium text-amber-700">Unassigned</span>
          ) : (
            <>Staff: <span className="font-medium text-slate-700">{client.assignedStaff?.name}</span></>
          )}
        </p>
        <Link
          href={`/clients/${client._id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-800 shrink-0"
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
    </>
  );
}
