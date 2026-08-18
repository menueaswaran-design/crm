"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileCheck2,
  CheckSquare,
  FolderOpen,
  Receipt,
  UserCog,
  Scale,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { initials } from "@/lib/utils";
import NotificationBell from "@/components/layout/NotificationBell";
import UserMenu from "@/components/layout/UserMenu";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/compliance", label: "Compliance", icon: FileCheck2 },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/staff", label: "Staff", icon: UserCog },
];

export default function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (href) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 h-14 max-w-7xl w-full mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="lg:hidden p-2 rounded-md hover:bg-slate-100 text-slate-600"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <div className="h-8 w-8 rounded-md bg-indigo-600 flex items-center justify-center">
                <Scale size={16} className="text-white" />
              </div>
              <p className="font-semibold tracking-tight text-slate-900 text-sm">CA Office</p>
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={15} className={active ? "text-indigo-600" : "text-slate-400"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-slate-200 flex flex-col lg:hidden">
            <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-indigo-600 flex items-center justify-center">
                  <Scale size={16} className="text-white" />
                </div>
                <p className="font-semibold text-slate-900 text-sm">CA Office</p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-md hover:bg-slate-100 text-slate-500"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-slate-100 text-slate-900 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={16} className={active ? "text-indigo-600" : "text-slate-400"} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {user && (
              <div className="px-4 py-4 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                    {initials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 capitalize truncate">{user.role}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
