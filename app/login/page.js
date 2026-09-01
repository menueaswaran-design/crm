"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Scale,
  Mail,
  Lock,
  AlertCircle,
  Info,
  ShieldCheck,
  FileCheck2,
  TrendingUp,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { resolvePostLoginRedirect } from "@/lib/permissions";
import Button from "@/components/common/Button";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="skeleton h-10 w-44 rounded-xl" />
    </div>
  );
}

const FEATURES = [
  { icon: FileCheck2, title: "Compliance tracking", desc: "Never miss a filing deadline" },
  { icon: TrendingUp, title: "Billing & payments", desc: "GST invoices, partial payments" },
  { icon: ShieldCheck, title: "Secure & role-based", desc: "Admin and staff access controls" },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get("redirect");
  const { user, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [role, setRole] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    if (user) router.push(resolvePostLoginRedirect(user, requestedRedirect));
  }, [user, requestedRedirect, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedInUser = await login({ email, password, role });
      router.push(resolvePostLoginRedirect(loggedInUser, requestedRedirect));
    } catch (err) {
      setError(err.message || "Unable to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (demoRole) => {
    setError("");
    setLoading(true);
    const creds =
      demoRole === "admin"
        ? { email: "admin@caoffice.com", password: "demo123", role: "admin" }
        : { email: "priya@caoffice.com", password: "demo123", role: "staff" };
    try {
      const loggedInUser = await login(creds);
      router.push(resolvePostLoginRedirect(loggedInUser));
    } catch (err) {
      setError(err.message || "Demo login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex min-h-screen">
      {/* Branding panel */}
      <div className="hidden lg:flex lg:w-[46%] relative bg-linear-to-br from-slate-950 via-brand-950 to-brand-900 text-white flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-linear-to-br from-brand-500 to-brand-700 flex items-center justify-center ring-1 ring-white/20 shadow-xl shadow-brand-900/40">
            <Scale size={22} />
          </div>
          <div>
            <p className="font-semibold text-lg tracking-tight leading-tight">CA Office CRM</p>
            <p className="text-xs text-slate-400">Professional Accounting Solutions</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight">
            Run your practice with confidence.
          </h1>
          <p className="mt-4 text-slate-400 text-sm xl:text-base leading-relaxed">
            Clients, compliance, tasks, documents and billing — all in one secure workspace built
            for chartered accountant firms.
          </p>

          <div className="mt-10 space-y-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3.5">
                <div className="h-9 w-9 rounded-lg bg-white/10 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                  <f.icon size={17} className="text-brand-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] text-slate-500">
          © {new Date().getFullYear()} CA Office CRM · Built for professional practice
        </p>
      </div>

      {/* Form panel */}
      <div className="flex-1 relative flex flex-col items-center justify-center px-4 py-10 overflow-hidden bg-[radial-gradient(700px_500px_at_20%_10%,rgba(99,102,241,0.08),transparent_60%),radial-gradient(600px_450px_at_90%_90%,rgba(14,165,233,0.07),transparent_60%)]">
        <div aria-hidden className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-300/20 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl pointer-events-none" />
        <div className="w-full max-w-104 relative">
          <div className="lg:hidden mb-8 flex flex-col items-center">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg">
              <Scale size={22} />
            </div>
            <h1 className="mt-3 text-xl font-bold text-slate-900 tracking-tight">CA Office CRM</h1>
            <p className="text-xs text-slate-500 mt-0.5">Professional Accounting Solutions</p>
          </div>

          <div className="glass border border-white/70 rounded-2xl shadow-popover p-6 sm:p-8 animate-fade-in-up">
            <div className="h-1 w-12 rounded-full bg-linear-to-r from-brand-500 to-sky-400 mb-5" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to continue to your workspace</p>

            {demoMode && (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-sky-50 border border-sky-100 p-3 text-xs text-sky-800">
                <Info size={15} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Demo mode is active.</p>
                  <p className="mt-0.5 text-sky-700">
                    Firebase is not configured — use the demo accounts below.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="label-base">Role</label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100">
                  {["admin", "staff"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`capitalize rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        role === r
                          ? "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-base">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@caoffice.com"
                    className="input-base pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="label-base">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-base pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Remember me
                </label>
                <a href="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  Forgot password?
                </a>
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                {loading ? "Signing in..." : "Sign in"}
                {!loading && <ArrowRight size={16} />}
              </Button>
            </form>

            {demoMode && (
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
                <p className="text-xs font-medium text-slate-400">Quick demo access</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="md" onClick={() => demoLogin("admin")} disabled={loading}>
                    <ShieldCheck size={14} className="text-brand-600" /> Demo Admin
                  </Button>
                  <Button variant="secondary" size="md" onClick={() => demoLogin("staff")} disabled={loading}>
                    <Scale size={14} className="text-slate-500" /> Demo Staff
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
