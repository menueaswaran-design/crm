"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Save, Send, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/client";
import Button from "@/components/common/Button";
import { Input } from "@/components/common/Field";
import ErrorBanner from "@/components/common/ErrorBanner";
import { getErrorMessage } from "@/lib/utils";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    fromName: "CA Office CRM",
    fromEmail: "",
    enabled: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const json = await apiFetch("/api/settings/smtp");
      const s = json.data || {};
      setForm({
        host: s.host || "",
        port: s.port || 587,
        secure: s.secure === true,
        user: s.user || "",
        pass: "",
        fromName: s.fromName || "CA Office CRM",
        fromEmail: s.fromEmail || "",
        enabled: s.enabled === true,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const json = await apiFetch("/api/settings/smtp", {
        method: "PUT",
        body: form,
      });
      setForm((f) => ({ ...f, pass: "" }));
      setSuccess(json.message || "SMTP settings saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testTo.trim()) return setError("Enter the email address to send the test to.");
    setTesting(true);
    setError("");
    setSuccess("");
    try {
      const json = await apiFetch("/api/settings/smtp/test", {
        method: "POST",
        body: { to: testTo.trim() },
      });
      setSuccess(json.message || "Test email sent.");
      setTestTo("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  const toggleRow = (title, subtitle, checked, onChange) => (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-brand-600" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure how the CRM sends emails</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}
      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={15} className="shrink-0" /> {success}
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Mail size={18} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Email (SMTP)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              When a task is assigned to staff, the CRM emails them at their account address using these mail
              server details. In-app notifications are always sent too.
            </p>
          </div>
          <span
            className={`ml-auto shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 ${
              form.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {form.enabled ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            {form.enabled ? "Email enabled" : "Email disabled"}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="SMTP Host"
                placeholder="e.g. smtp.gmail.com"
                value={form.host}
                onChange={(e) => set("host", e.target.value)}
                hint="Your mail provider's SMTP server."
              />
              <Input
                label="Port"
                type="number"
                placeholder="587"
                value={form.port}
                onChange={(e) => set("port", e.target.value)}
                hint="587 (TLS) or 465 (SSL)."
              />
              <Input
                label="Username"
                placeholder="you@yourfirm.com"
                value={form.user}
                onChange={(e) => set("user", e.target.value)}
                hint="Full email address or SMTP username."
              />
              <Input
                label="Password / App password"
                type="password"
                placeholder="••••••••"
                value={form.pass}
                onChange={(e) => set("pass", e.target.value)}
                hint="For Gmail, use an app password, not your login password."
              />
              <Input
                label="From Name"
                placeholder="CA Office CRM"
                value={form.fromName}
                onChange={(e) => set("fromName", e.target.value)}
              />
              <Input
                label="From Email"
                placeholder="no-reply@yourfirm.com"
                value={form.fromEmail}
                onChange={(e) => set("fromEmail", e.target.value)}
                hint="Shown as the sender of outgoing emails."
              />
            </div>

            {toggleRow(
              "Send emails from this account",
              "Enable automatic emails (e.g. task assigned to staff). SMTP credentials must be correct.",
              form.enabled,
              (v) => set("enabled", v)
            )}
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-2 w-full sm:max-w-md">
            <Input
              label="Test recipient"
              type="email"
              placeholder="you@yourfirm.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleTest} loading={testing} disabled={saving}>
              <Send size={14} /> Send test email
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={testing} type="button">
              <Save size={14} /> Save settings
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
        <ShieldCheck size={16} className="text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-600 leading-relaxed">
          Only administrators can view or change these settings. Passwords are stored encrypted in your
          database and never returned to the browser. Emails are only sent once SMTP is enabled and a test
          email succeeds.
        </p>
      </div>
    </div>
  );
}