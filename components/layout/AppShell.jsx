"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import TopNav from "@/components/layout/TopNav";

export default function AppShell({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    document.body.classList.remove("bg-black");
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <TopNav />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-7xl w-full mx-auto">
        {children}
      </main>
      <footer className="px-4 py-4 text-center text-[11px] text-slate-400 border-t border-slate-200 bg-white">
        CA Office CRM
      </footer>
    </div>
  );
}
