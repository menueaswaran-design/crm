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
    <div className="app-canvas flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {denied ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-slate-400">Redirecting...</p>
          </div>
        ) : (
          children
        )}
      </main>
      <footer className="mt-auto border-t border-hairline bg-white/60 px-4 py-3.5 text-center text-[11px] text-slate-400">
        CA Office CRM
      </footer>
    </div>
  );
}
