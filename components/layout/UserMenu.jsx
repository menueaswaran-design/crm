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
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-lg border border-transparent py-1 pl-1.5 pr-2 transition-colors hover:border-hairline hover:bg-slate-50"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white shadow-[0_1px_2px_rgba(79,70,229,0.28)]">
          {initials(user.name)}
        </div>
        <div className="hidden text-left md:block">
          <p className="text-[13px] font-medium leading-tight tracking-[-0.008em] text-slate-900">
            {user.name}
          </p>
          <p className="text-[11px] capitalize leading-tight text-slate-500">{user.role}</p>
        </div>
        <ChevronDown size={14} className="hidden text-slate-400 transition-transform md:block" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 animate-slide-down rounded-xl border border-hairline bg-white py-1.5 shadow-popover"
        >
          <div className="mb-1 border-b border-hairline px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
                {initials(user.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-900">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-500">
            <ShieldCheck size={14} className="text-emerald-500" />
            Signed in as{" "}
            <span className="font-medium capitalize text-slate-700">{user.role}</span>
          </div>
          <div className="my-1 border-t border-hairline" />
          <button className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
            <UserIcon size={15} className="text-slate-400" /> Profile
          </button>
          <div className="my-1 border-t border-hairline" />
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-rose-600 transition-colors hover:bg-rose-50"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
