"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import TopNav from "@/components/layout/TopNav";
import { useAuth } from "@/context/AuthContext";
import { hasPermission, NAV_PERMISSIONS, getDefaultRoute } from "@/lib/permissions";

const PATH_TO_PERMISSION = Object.fromEntries(
  NAV_PERMISSIONS.map((p) => [p.href, p.key])
);

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
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
  const denied = user && !hasPermission(user, permissionKey);
  const firstAllowed = getDefaultRoute(user);

  useEffect(() => {
    if (denied && firstAllowed && segment !== firstAllowed) {
      router.replace(firstAllowed);
    }
  }, [denied, firstAllowed, segment, router]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <TopNav />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-7xl w-full mx-auto">
        {denied ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-slate-400">Redirecting...</p>
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
