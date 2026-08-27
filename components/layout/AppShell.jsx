"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldX } from "lucide-react";
import TopNav from "@/components/layout/TopNav";
import { useAuth } from "@/context/AuthContext";
import { hasPermission, effectivePermissions, NAV_PERMISSIONS } from "@/lib/permissions";

const PATH_TO_PERMISSION = Object.fromEntries(
  NAV_PERMISSIONS.map((p) => [p.href, p.key])
);

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    document.body.classList.remove("bg-black");
  }, [pathname]);

  // Keep permissions fresh so admin changes apply without re-login
  useEffect(() => {
    if (user) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const segment = `/${(pathname.split("/")[1] || "").replace(/\/$/, "")}`;
  const permissionKey = PATH_TO_PERMISSION[segment];
  const adminOnly = segment === "/settings";
  const denied =
    user && (adminOnly ? user.role !== "admin" : !hasPermission(user, permissionKey));
  const firstAllowed = NAV_PERMISSIONS.find((p) => hasPermission(user, p.key))?.href || "/dashboard";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <TopNav />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-7xl w-full mx-auto">
        {denied ? (
          <div className="card p-10 max-w-md mx-auto text-center mt-10">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
              <ShieldX size={26} />
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Access restricted</h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Your account does not have permission to open this section. Ask an admin to grant access from Staff settings.
            </p>
            <Link
              href={firstAllowed}
              className="mt-5 inline-block rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800 transition-colors"
            >
              Go back
            </Link>
          </div>
        ) : (
          children
        )}
      </main>
      <footer className="px-4 py-4 text-center text-[11px] text-slate-400 border-t border-slate-200 bg-white">
        CA Office CRM
      </footer>
    </div>
  );
}
