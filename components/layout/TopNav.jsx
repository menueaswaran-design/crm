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
  Building2,
  Scale,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { initials } from "@/lib/utils";
import { hasPermission, getDefaultRoute, SUPER_ADMIN_ROUTE } from "@/lib/permissions";
import NotificationBell from "@/components/layout/NotificationBell";
import UserMenu from "@/components/layout/UserMenu";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
  { href: "/clients", label: "Clients", icon: Users, permission: "clients" },
  { href: "/compliance", label: "Worklist", icon: FileCheck2, permission: "compliance" },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, permission: "tasks" },
  { href: "/documents", label: "Documents", icon: FolderOpen, permission: "documents" },
  { href: "/invoices", label: "Invoices", icon: Receipt, permission: "invoices" },
  { href: "/staff", label: "Staff", icon: UserCog, permission: "__admin_only" },
  { href: SUPER_ADMIN_ROUTE, label: "Companies", icon: Building2, permission: "__super_admin_only" },
];

export default function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.permission === "__admin_only") return user?.role === "admin";
    if (item.permission === "__super_admin_only") return user?.role === "superAdmin";
    return hasPermission(user, item.permission);
  });
  const homeHref = getDefaultRoute(user);

  const isActive = (href) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-hairline bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <Link href={homeHref} className="flex items-center gap-2.5 shrink-0 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-[0_1px_2px_rgba(79,70,229,0.32)] transition-transform group-hover:scale-[1.03]">
                <Scale size={16} className="text-white" />
              </div>
              <p className="text-sm font-semibold tracking-[-0.014em] text-slate-900">CA Office</p>
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {visibleItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] transition-all duration-150 ${
                    active
                      ? "bg-brand-50 font-semibold text-brand-700"
                      : "font-medium text-slate-500 hover:bg-slate-100/70 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    size={15}
                    className={active ? "text-brand-600" : "text-slate-400"}
                  />
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
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-hairline bg-white shadow-popover lg:hidden">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-[0_1px_2px_rgba(79,70,229,0.32)]">
                  <Scale size={16} className="text-white" />
                </div>
                <p className="text-sm font-semibold tracking-[-0.014em] text-slate-900">CA Office</p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
              {visibleItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-brand-50 font-semibold text-brand-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={active ? "text-brand-600" : "text-slate-400"}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {user && (
              <div className="border-t border-hairline bg-canvas/40 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                    {initials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                    <p className="truncate text-xs capitalize text-slate-500">{user.role}</p>
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
