"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Scale, Lock, AlertCircle, CheckCircle2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import Button from "@/components/common/Button";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetLoading />}>
      <ResetContent />
    </Suspense>
  );
}

function ResetLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="skeleton h-10 w-44 rounded-xl" />
    </div>
  );
}

function ResetContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const code = searchParams.get("code");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasCredential = Boolean(token || code);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || "Unable to reset the password. Please try again.");
      } else {
        setStatus(json.message || "Password updated. You can now sign in.");
        setPassword("");
        setConfirm("");
      }
    } catch (err) {
      setError(err.message || "Unable to reset the password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-linear-to-br from-brand-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-brand-600/30">
            <Scale size={26} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Choose a new password</h1>
          <p className="mt-1 text-sm text-slate-500">Enter a new password for your account.</p>
        </div>

        <div className="card p-6">
          {status && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
              <div>
                <p>{status}</p>
                <Link href="/login" className="mt-1 inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline">
                  <ArrowLeft size={13} /> Sign in with your new password
                </Link>
              </div>
            </div>
          )}

          {!hasCredential ? (
            <div>
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                This link is missing the reset code. Please use the link from your reset email.
              </div>
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
              >
                <ArrowLeft size={14} /> Request a new reset link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">
                  <AlertCircle size={15} className="shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="label-base">New password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
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

              <div>
                <label className="label-base">Confirm new password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="input-base pl-10"
                  />
                </div>
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                {loading ? "Updating..." : "Update password"}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-700 hover:underline"
            >
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}