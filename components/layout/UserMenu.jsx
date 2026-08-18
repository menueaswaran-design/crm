"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut, User as UserIcon, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { initials } from "@/lib/utils";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-xl hover:bg-slate-100 pl-1.5 pr-2 py-1.5 transition-colors"
      >
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-sm">
          {initials(user.name)}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-[13px] font-semibold text-slate-900 leading-tight">{user.name}</p>
          <p className="text-[11px] text-slate-400 capitalize leading-tight">{user.role}</p>
        </div>
        <ChevronDown size={14} className="text-slate-400 hidden md:block" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-popover py-2 z-50 animate-slide-down">
          <div className="px-4 py-3 border-b border-slate-100 mb-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-xs font-bold">
                {initials(user.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
          <div className="px-4 py-2 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={14} className="text-emerald-500" />
            Signed in as{" "}
            <span className="font-semibold capitalize text-slate-700">{user.role}</span>
          </div>
          <button
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <UserIcon size={15} className="text-slate-400" /> Profile
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
