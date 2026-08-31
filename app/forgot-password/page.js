"use client";

import { useState } from "react";
import Link from "next/link";
import { Scale, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { isFirebaseConfigured, getFirebaseApp } from "@/lib/firebase";
import { sendPasswordResetEmail, getAuth } from "firebase/auth";
import Button from "@/components/common/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const demoMode = !isFirebaseConfigured();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.message || "Unable to send reset email. Please try again.");
        return;
      }

      setStatus(json.message || "If an account exists for that email, a reset link has been sent.");

      // Server couldn't deliver the email → fall back to Firebase's own sender
      // (works for accounts registered in Firebase Auth).
      if (!json.sent) {
        if (!demoMode) {
          try {
            const app = getFirebaseApp();
            const auth = getAuth(app);
            await sendPasswordResetEmail(auth, email);
            setStatus("If an account exists for that email, a reset link has been sent.");
          } catch (firebaseErr) {
            if (json.hint) setStatus(json.hint);
          }
        } else if (json.hint) {
          setStatus(json.hint);
        }
      }
    } catch (err) {
      setError(err.message || "Unable to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-brand-600/30">
            <Scale size={26} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Reset password</h1>
          <p className="mt-1 text-sm text-slate-500">We&apos;ll email you a link to reset your password.</p>
        </div>

        <div className="card p-6">
          {status && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
              {status}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>

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
