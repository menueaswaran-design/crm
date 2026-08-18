"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/layout/AppShell";
import { Scale } from "lucide-react";

export default function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg shadow-brand-200 animate-pulse">
          <Scale size={22} />
        </div>
        <p className="text-sm text-slate-400">Loading CA Office CRM...</p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
