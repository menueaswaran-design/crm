"use client";

import Link from "next/link";
import { Pencil, Trash2, ArrowUpRight } from "lucide-react";
import { CategoryBadge } from "@/components/common/Badge";

export default function ClientsList({ clients, onEdit, onDelete }) {
  return (
    <div className="card divide-y divide-slate-100">
      {clients.map((c) => (
        <div key={c._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
          <div className="min-w-0 flex-1 flex items-center gap-3">
            <Link href={`/clients/${c._id}`} className="font-medium text-sm text-slate-900 hover:text-indigo-700 truncate">
              {c.name}
            </Link>
            <CategoryBadge category={c.category} />
            {c.status === "inactive" && (
              <span className="text-[11px] rounded bg-slate-100 text-slate-500 px-1.5 py-0.5 shrink-0">Inactive</span>
            )}
            <span className="hidden md:inline font-mono text-xs text-slate-400 truncate">{c.pan || ""}</span>
            <span className="hidden lg:inline text-xs text-slate-400 truncate">{c.email || ""}</span>
          </div>
          <div className="hidden sm:block w-32 text-right text-xs text-slate-500 truncate">
            {c.assignedStaff ? c.assignedStaff.name : <span className="font-medium text-amber-700">Unassigned</span>}
          </div>
          <div className="flex gap-0.5 shrink-0">
            <Link
              href={`/clients/${c._id}`}
              className="p-1.5 rounded-md text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
              aria-label="View client"
            >
              <ArrowUpRight size={15} />
            </Link>
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
  );
}
