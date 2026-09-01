"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2, ArrowUpRight, MessageSquare } from "lucide-react";
import { CategoryBadge } from "@/components/common/Badge";
import WhatsAppMessageModal from "@/components/whatsapp/WhatsAppMessageModal";
import { generateClientMessage } from "@/lib/whatsappMessages";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ClientsTable({ clients, onEdit, onDelete }) {
  const [whatsappClient, setWhatsappClient] = useState(null);

  const handleWhatsApp = (c) => {
    setWhatsappClient(c);
  };

  return (
    <>
    <div className="card overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">PAN / GSTIN</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium">Staff</th>
            <th className="px-4 py-3 font-medium">Added</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {clients.map((c) => (
            <tr key={c._id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3">
                <Link href={`/clients/${c._id}`} className="font-medium text-slate-900 hover:text-indigo-700">
                  {c.name}
                </Link>
                {c.clientCode && (
                  <p className="font-mono text-[11px] text-slate-400">{c.clientCode}</p>
                )}
                {c.status === "inactive" && (
                  <span className="ml-2 text-[11px] rounded bg-slate-100 text-slate-500 px-1.5 py-0.5">Inactive</span>
                )}
              </td>
              <td className="px-4 py-3"><CategoryBadge category={c.category} /></td>
              <td className="px-4 py-3">
                <p className="font-mono text-xs text-slate-600">{c.pan || "—"}</p>
                {c.gstin && <p className="font-mono text-xs text-slate-400">{c.gstin}</p>}
              </td>
              <td className="px-4 py-3 text-slate-600">
                <p className="truncate max-w-44">{c.email || "—"}</p>
                <p className="text-xs text-slate-400">{c.phone || ""}</p>
              </td>
              <td className="px-4 py-3">
                {c.assignedStaff ? (
                  <span className="text-slate-700">{c.assignedStaff.name}</span>
                ) : (
                  <span className="font-medium text-amber-700">Unassigned</span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(c.createdAt)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-0.5 justify-end">
                  <Link
                    href={`/clients/${c._id}`}
                    className="p-1.5 rounded-md text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <WhatsAppMessageModal
      open={!!whatsappClient}
      onClose={() => setWhatsappClient(null)}
      client={whatsappClient}
      initialMessage={whatsappClient ? generateClientMessage({ client: whatsappClient }) : ""}
      clientId={whatsappClient?._id}
      messageType="CLIENT_MESSAGE"
    />
    </>
  );
}
