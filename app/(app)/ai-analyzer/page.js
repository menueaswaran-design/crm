"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  IndianRupee,
  User,
  ListTodo,
  FileCheck2,
} from "lucide-react";
import { apiFetch, postData } from "@/lib/client";
import { useAuth } from "@/context/AuthContext";
import { formatINR, formatDate, getErrorMessage, COMPLIANCE_CATEGORIES } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import ClientSearchPicker from "@/components/clients/ClientSearchPicker";
import Button from "@/components/common/Button";
import ErrorBanner from "@/components/common/ErrorBanner";
import EmptyState from "@/components/common/EmptyState";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";
const MAX_SIZE = 10 * 1024 * 1024;

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{label}</p>
      <div className="mt-1 text-sm text-slate-900">{children}</div>
    </div>
  );
}

export default function AiAnalyzerPage() {
  const { user } = useAuth();
  const canCreateTask = hasPermission(user, "tasks");
  const canCreateCompliance = hasPermission(user, "compliance");

  const [configured, setConfigured] = useState(null);
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const [clientId, setClientId] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [creating, setCreating] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const json = await apiFetch("/api/ai/analyze-document");
        setConfigured(Boolean(json.data?.configured));
      } catch {
        setConfigured(false);
      }
    })();
  }, []);

  const resetResult = () => {
    setResult(null);
    setSuccessMsg("");
    setError("");
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setError("");
    setSuccessMsg("");
    setResult(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_SIZE) {
      setError("File too large. Maximum size is 10 MB.");
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return setError("Please choose a PDF or image file.");
    setAnalyzing(true);
    setError("");
    setSuccessMsg("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const json = await apiFetch("/api/ai/analyze-document", {
        method: "POST",
        body: formData,
      });
      setResult(json.data);
      if (json.data?.matchedClient) {
        setClientId(json.data.matchedClient._id);
        setSelectedClient(json.data.matchedClient);
      } else {
        setClientId("");
        setSelectedClient(null);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const analysis = result?.analysis;

  const buildDescription = useCallback(() => {
    if (!analysis) return "";
    const parts = [
      analysis.summary,
      analysis.actionRequired ? `Action required: ${analysis.actionRequired}` : "",
      analysis.amount != null ? `Amount: ${formatINR(analysis.amount)}` : "",
      result?.fileName ? `Source file: ${result.fileName}` : "",
    ].filter(Boolean);
    return parts.join("\n\n");
  }, [analysis, result?.fileName]);

  const ensureClient = () => {
    if (!clientId) {
      setError("Select a client before creating a task or compliance record.");
      return false;
    }
    return true;
  };

  const createTask = async () => {
    if (!analysis || !ensureClient()) return;
    setCreating("task");
    setError("");
    setSuccessMsg("");
    try {
      const dueDate =
        analysis.importantDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      await postData("/api/tasks", {
        title: analysis.suggestedTitle || analysis.documentType || "Document follow-up",
        description: buildDescription() || "Follow up on uploaded notice.",
        clientId,
        priority: analysis.priority || "MEDIUM",
        dueDate,
      });
      setSuccessMsg("Task created successfully. Open Tasks to continue.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating("");
    }
  };

  const createCompliance = async () => {
    if (!analysis || !ensureClient()) return;
    setCreating("compliance");
    setError("");
    setSuccessMsg("");
    try {
      const dueDate =
        analysis.importantDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const year = new Date(dueDate).getFullYear();
      const category = COMPLIANCE_CATEGORIES.includes(analysis.category)
        ? analysis.category
        : "Other";
      await postData("/api/compliance", {
        clientId,
        type: analysis.complianceType || "Other",
        category,
        period: analysis.documentType || "Notice",
        financialYear: `FY ${year}-${String(year + 1).slice(-2)}`,
        dueDate,
        description: buildDescription(),
        priority: analysis.priority || "MEDIUM",
        recurrence: "NONE",
      });
      setSuccessMsg("Compliance record created successfully. Open Compliance to continue.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating("");
    }
  };

  if (configured === false) {
    return (
      <div className="space-y-5">
        <Header />
        <EmptyState
          variant="unavailable"
          title="Gemini API key required"
          description="Add GEMINI_API_KEY to your .env.local file (from Google AI Studio), then restart the server."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Header />

      {error && <ErrorBanner message={error} onRetry={result ? undefined : handleAnalyze} />}
      {successMsg && (
        <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Upload notice / document</h2>
          <p className="text-sm text-slate-500">
            Upload a GST, Income Tax, ROC or other official notice (PDF or image). Gemini extracts
            dates, amounts, client details and suggested actions.
          </p>

          <label
            className={`flex flex-col items-center justify-center border border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
              file ? "border-emerald-300 bg-emerald-50/40" : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <UploadCloud size={28} className={file ? "text-emerald-500" : "text-slate-400"} />
            <p className="mt-3 text-sm text-slate-700 font-medium">
              {file ? file.name : "Click to choose a file"}
            </p>
            <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG · max 10 MB</p>
            <input type="file" accept={ACCEPT} className="hidden" onChange={handleFileChange} />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleAnalyze} loading={analyzing} disabled={!file || analyzing}>
              <Sparkles size={15} />
              {analyzing ? "Analyzing..." : "Analyze with AI"}
            </Button>
            {(file || result) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setFile(null);
                  resetResult();
                }}
                disabled={analyzing}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="card p-6">
          {!result && !analyzing && (
            <EmptyState
              compact
              variant="search"
              title="Results appear here"
              description="After analysis you’ll see document type, client match, due date, amount and actions."
              className="py-10"
            />
          )}
          {analyzing && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center animate-pulse">
                <Sparkles size={22} />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-800">Reading document with Gemini…</p>
              <p className="mt-1 text-xs text-slate-400">This usually takes a few seconds.</p>
            </div>
          )}
          {result && analysis && !analyzing && (
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-900 truncate">{analysis.documentType}</h2>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{result.fileName}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Client (from document)">
                  {analysis.clientName || "—"}
                  {(analysis.pan || analysis.gstin) && (
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      {[analysis.pan, analysis.gstin].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </Field>
                <Field label="Category">{analysis.category || "—"}</Field>
                <Field label="Important date">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={14} className="text-slate-400" />
                    {analysis.importantDate ? formatDate(analysis.importantDate) : "Not found"}
                  </span>
                </Field>
                <Field label="Amount">
                  <span className="inline-flex items-center gap-1.5">
                    <IndianRupee size={14} className="text-slate-400" />
                    {analysis.amount != null ? formatINR(analysis.amount) : "Not found"}
                  </span>
                </Field>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  Action required
                </p>
                <p className="mt-1 text-sm text-slate-800">
                  {analysis.actionRequired || "—"}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  Summary
                </p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {analysis.summary || "—"}
                </p>
              </div>

              {result.matchedClient ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-xs text-emerald-800 flex items-start gap-2">
                  <User size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Matched CRM client <strong>{result.matchedClient.name}</strong>
                    {result.matchReason ? ` via ${result.matchReason}` : ""}. Confirm or change below.
                  </span>
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  No automatic client match. Select the client manually before creating work items.
                </div>
              )}

              <ClientSearchPicker
                value={clientId}
                onChange={(id) => {
                  setClientId(id);
                  if (!id) setSelectedClient(null);
                }}
                selectedClient={selectedClient}
                label="CRM client"
                required
              />

              <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                {canCreateTask && (
                  <Button
                    size="sm"
                    onClick={createTask}
                    loading={creating === "task"}
                    disabled={!!creating}
                  >
                    <ListTodo size={14} /> Create Task
                  </Button>
                )}
                {canCreateCompliance && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={createCompliance}
                    loading={creating === "compliance"}
                    disabled={!!creating}
                  >
                    <FileCheck2 size={14} /> Create Compliance
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
        <Sparkles size={22} className="text-indigo-600" />
        AI Document Analyzer
      </h1>
      <p className="text-sm text-slate-500 mt-0.5">
        Extract notice details with Gemini, then create a task or compliance record
      </p>
    </div>
  );
}
