"use client";

import { useState } from "react";
import { FileSpreadsheet, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { getToken } from "@/lib/client";

const REQUIRED_COLUMNS = [
  "name",
  "category",
  "pan",
  "email",
  "phone",
  "address",
];

const OPTIONAL_COLUMNS = [
  "aadhaar",
  "gstin",
  "cin",
  "assignedStaffEmail",
  "assignedStaffName",
  "assignedStaffId",
  "status",
];

export default function ImportClientsModal({ open, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const resetState = () => {
    setFile(null);
    setLoading(false);
    setError("");
    setResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose an Excel file first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

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

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Clients From Excel"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button type="submit" form="import-clients-form" loading={loading}>
            <Upload size={16} /> {loading ? "Importing..." : "Import Clients"}
          </Button>
        </div>
      }
    >
      <form id="import-clients-form" onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
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
            {result.errors?.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto rounded border border-emerald-200 bg-white p-2 text-xs text-slate-600">
                {result.errors.slice(0, 20).map((msg, idx) => (
                  <p key={idx}>• {msg}</p>
                ))}
                {result.errors.length > 20 && <p>...and {result.errors.length - 20} more</p>}
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <FileSpreadsheet size={18} />
            </div>
            <div className="text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Excel format</p>
              <p className="mt-1">Upload .xlsx or .xls file. First sheet will be used.</p>
              <p className="mt-2 text-slate-500">
                Required columns: {REQUIRED_COLUMNS.join(", ")}
              </p>
          <p className="mt-1 text-slate-500">
            Optional columns: {OPTIONAL_COLUMNS.join(", ")}
          </p>
          <p className="mt-1 text-slate-500">
            Leave staff columns blank to import as Unassigned.
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
          <p className="mt-1">PAN and GSTIN duplicates will be skipped automatically.</p>
          <p>Staff columns are optional. If provided, use assignedStaffEmail for best match.</p>
        </div>
      </form>
    </Modal>
  );
}
