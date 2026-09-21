"use client";

import { useState } from "react";
import {
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { getToken } from "@/lib/client";

export default function ImportClientsModal({ open, onClose, onImported }) {
  const [step, setStep] = useState(1); // 1 = upload, 2 = preview
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [extraFieldNames, setExtraFieldNames] = useState({});
  const [showAllErrors, setShowAllErrors] = useState(false);

  const resetState = () => {
    setStep(1);
    setFile(null);
    setLoading(false);
    setError("");
    setPreview(null);
    setResult(null);
    setExtraFieldNames({});
    setShowAllErrors(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose an Excel file first.");
      return;
    }

    setLoading(true);
    setError("");
    setPreview(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = getToken();
      const res = await fetch("/api/clients/import/preview", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to analyze file.");
      }

      setPreview(json.data);
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to analyze file.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("extraFieldNames", JSON.stringify(extraFieldNames));

      const token = getToken();
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Import failed.");
      }

      setResult(json.data);
      onImported?.();
    } catch (err) {
      setError(err.message || "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  const mappedFields = preview?.mappings?.filter((m) => m.status === "mapped") || [];
  const extraFields = preview?.mappings?.filter((m) => m.status === "extra") || [];
  const missingRequired = preview?.missingRequired || [];
  const missingOptional = preview?.missingOptional || [];
  const sampleRows = preview?.sampleRows || [];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={step === 1 ? "Import Clients From Excel" : "Review Mapping"}
      maxWidth="max-w-2xl"
      footer={
        result ? (
          <div className="flex justify-end">
            <Button type="button" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : step === 1 ? (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" form="import-preview-form" loading={loading}>
              <ArrowRight size={16} /> Next: Review Mapping
            </Button>
          </div>
        ) : (
          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={() => { setStep(1); setPreview(null); setError(""); }}>
              <ArrowLeft size={16} /> Back
            </Button>
            <Button type="button" onClick={handleImport} loading={loading} disabled={missingRequired.length > 0}>
              <Upload size={16} /> {loading ? "Importing..." : "Import Clients"}
            </Button>
          </div>
        )
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} /> Import complete
          </div>
          <p className="mt-1">Created: {result.createdCount} clients</p>
          <p>Skipped: {result.skippedCount} rows</p>

          {result.skipSummary && (
            <div className="mt-2 flex flex-wrap gap-2">
              {result.skipSummary.bothEmpty > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                  {result.skipSummary.bothEmpty} empty rows (no name &amp; PAN)
                </span>
              )}
              {result.skipSummary.missingName > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                  {result.skipSummary.missingName} missing name
                </span>
              )}
              {result.skipSummary.missingPan > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                  {result.skipSummary.missingPan} missing PAN
                </span>
              )}
              {result.skipSummary.duplicatePan > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {result.skipSummary.duplicatePan} duplicate PAN
                </span>
              )}
              {result.skipSummary.duplicateGstin > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {result.skipSummary.duplicateGstin} duplicate GSTIN
                </span>
              )}
              {result.skipSummary.duplicateAadhaar > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {result.skipSummary.duplicateAadhaar} duplicate Aadhaar
                </span>
              )}
              {result.skipSummary.invalidFormat > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                  {result.skipSummary.invalidFormat} invalid format
                </span>
              )}
              {result.skipSummary.insertFailed > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                  {result.skipSummary.insertFailed} insert failed
                </span>
              )}
            </div>
          )}

          {result.errors?.length > 0 && (
            <div className="mt-2 rounded border border-emerald-200 bg-white text-xs text-slate-600">
              <div className="max-h-64 overflow-y-auto p-2">
                {(showAllErrors ? result.errors : result.errors.slice(0, 30)).map((msg, idx) => (
                  <p key={idx}>• {msg}</p>
                ))}
              </div>
              {result.errors.length > 30 && (
                <button
                  type="button"
                  onClick={() => setShowAllErrors(!showAllErrors)}
                  className="w-full border-t border-emerald-200 px-2 py-1.5 text-center font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  {showAllErrors ? "Show less" : `Show all ${result.errors.length} errors`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!result && step === 1 && (
        <form id="import-preview-form" onSubmit={handlePreview} className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                <FileSpreadsheet size={18} />
              </div>
              <div className="text-sm text-slate-600">
                <p className="font-semibold text-slate-900">How it works</p>
                <ol className="mt-1 list-decimal list-inside space-y-0.5">
                  <li>Upload your Excel file</li>
                  <li>Review the auto-detected column mappings</li>
                  <li>Confirm to import</li>
                </ol>
                <p className="mt-2 text-slate-500">
                  Only <strong>name</strong> and <strong>PAN</strong> are required. All other columns are optional.
                </p>
                <p className="mt-1 text-slate-500">
                  Column headers like &quot;Status&quot;, &quot;Father name&quot;, &quot;Mobile Number&quot; etc. are auto-mapped.
                  Any extra columns are saved as additional data.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="label-base">Select Excel File</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="input-base"
            />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={14} /> Notes
            </div>
            <p className="mt-1">PAN duplicates will be skipped automatically.</p>
            <p>Title rows (like &quot;Winman CA-ERP - MIS report&quot;) are auto-detected and skipped.</p>
          </div>
        </form>
      )}

      {!result && step === 2 && preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              Found <strong>{preview.totalRows}</strong> data rows
            </span>
            <span className="text-slate-500">{mappedFields.length} fields mapped</span>
          </div>

          {missingRequired.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm">
              <div className="flex items-center gap-2 font-semibold text-rose-700">
                <AlertTriangle size={14} /> Missing required fields
              </div>
              <p className="mt-1 text-rose-600">
                These required fields are not found in your Excel:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {missingRequired.map((f) => (
                  <span key={f.field} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
                    {f.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Mapped Columns
            </div>
            <div className="divide-y divide-slate-50">
              {mappedFields.map((m) => (
                <div key={m.excelHeader} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                      {m.excelHeader}
                    </span>
                    <ArrowRight size={14} className="text-slate-300" />
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {m.label}
                    </span>
                  </div>
                  <CheckCircle2 size={14} className="text-emerald-500" />
                </div>
              ))}
            </div>
          </div>

          {extraFields.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Extra Columns — Name them for storage
              </div>
              <div className="divide-y divide-slate-50">
                {extraFields.map((m) => (
                  <div key={m.excelHeader} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600 min-w-[120px]">
                      {m.excelHeader}
                    </span>
                    <span className="text-slate-300">→</span>
                    <input
                      type="text"
                      placeholder={m.excelHeader}
                      value={extraFieldNames[m.excelHeader] || ""}
                      onChange={(e) =>
                        setExtraFieldNames((prev) => ({
                          ...prev,
                          [m.excelHeader]: e.target.value,
                        }))
                      }
                      className="input-base flex-1 text-xs"
                    />
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 text-xs text-slate-400">
                Leave blank to keep original column name. These will be stored as additional fields.
              </div>
            </div>
          )}

          {missingOptional.length > 0 && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <span className="font-medium">Other available fields not in your Excel: </span>
              {missingOptional.map((f) => f.label).join(", ")}
            </div>
          )}

          {sampleRows.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Sample Data (first {sampleRows.length} rows)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {mappedFields.slice(0, 6).map((m) => (
                        <th key={m.clientField} className="px-3 py-2 text-left font-medium text-slate-500">
                          {m.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleRows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        {mappedFields.slice(0, 6).map((m) => (
                          <td key={m.clientField} className="px-3 py-2 text-slate-700 max-w-[120px] truncate">
                            {row.mapped[m.clientField] || <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
