"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCloud, X, FileText } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { Select } from "@/components/common/Field";
import ClientSearchPicker from "@/components/clients/ClientSearchPicker";
import { apiFetch } from "@/lib/client";
import { DOCUMENT_CATEGORIES, formatBytes } from "@/lib/utils";

const ALLOWED = ["pdf", "docx", "xlsx", "xls", "jpg", "jpeg", "png"];
const ACCEPT = ".pdf,.docx,.xlsx,.xls,.jpg,.jpeg,.png";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES = 20;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50 MB per batch

const fileKey = (f) => `${f.name}:${f.size}:${f.lastModified}`;

export default function UploadDocumentModal({ open, onClose, onUploaded, clientId }) {
  const [selectedClient, setSelectedClient] = useState(clientId || "");
  const [category, setCategory] = useState("GST");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setSelectedClient(clientId || "");
      setCategory("GST");
      setFiles([]);
      setError("");
      setDragging(false);
    }
  }, [open, clientId]);

  const addFiles = (incoming) => {
    const list = Array.from(incoming || []);
    if (!list.length) return;

    const rejected = [];
    const seen = new Set(files.map(fileKey));
    const merged = [...files];

    for (const f of list) {
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      if (!ALLOWED.includes(ext)) {
        rejected.push(`${f.name} (unsupported type)`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        rejected.push(`${f.name} (over ${MAX_SIZE / 1024 / 1024} MB)`);
        continue;
      }
      const key = fileKey(f);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(f);
    }

    if (merged.length > MAX_FILES) {
      rejected.push(`${merged.length - MAX_FILES} file(s) over the ${MAX_FILES}-file limit`);
      merged.splice(MAX_FILES);
    }

    const total = merged.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_TOTAL_SIZE) {
      rejected.push(`combined size over ${MAX_TOTAL_SIZE / 1024 / 1024} MB`);
    }

    setFiles(merged);
    setError(
      rejected.length
        ? `Skipped ${rejected.length} file(s): ${rejected.slice(0, 3).join(", ")}${
            rejected.length > 3 ? "…" : ""
          }`
        : ""
    );
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFileChange = (e) => addFiles(e.target.files);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError("");
  };

  const clearFiles = () => {
    setFiles([]);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUpload = async () => {
    setError("");
    if (!selectedClient) return setError("Please select a client.");
    if (!files.length) return setError("Please choose at least one file.");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("clientId", selectedClient);
      formData.append("category", category);
      files.forEach((f) => formData.append("file", f));

      const json = await apiFetch("/api/documents", { method: "POST", body: formData });
      const uploaded = json.data || [];
      const failed = json.failed || [];

      onUploaded(uploaded);

      if (failed.length) {
        const failedNames = new Set(failed.map((f) => f.name));
        setFiles((prev) => prev.filter((f) => !failedNames.has(f.name)));
        setError(
          `${uploaded.length} uploaded, ${failed.length} failed: ${failed
            .map((f) => f.name)
            .join(", ")}. Fix the issues and retry.`
        );
        return;
      }

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const hasFiles = files.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload Documents"
      maxWidth="max-w-xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={handleUpload} loading={loading} disabled={!hasFiles}>
            {loading
              ? "Uploading..."
              : hasFiles
                ? `Upload ${files.length} Document${files.length > 1 ? "s" : ""}`
                : "Upload"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-700">{error}</div>
        )}

        <ClientSearchPicker
          value={selectedClient}
          onChange={setSelectedClient}
          selectedClient={clientId ? { _id: clientId } : null}
          required
        />

        <Select label="Category" required value={category} onChange={(e) => setCategory(e.target.value)}>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <div>
          <div className="flex items-center justify-between">
            <label className="label-base">
              Select Files <span className="text-rose-500"> *</span>
            </label>
            {hasFiles && (
              <button
                type="button"
                onClick={clearFiles}
                className="text-xs font-medium text-rose-600 hover:text-rose-700"
              >
                Clear all
              </button>
            )}
          </div>

          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center border border-dashed rounded-lg p-5 cursor-pointer transition-colors ${
              dragging
                ? "border-indigo-400 bg-indigo-50/60"
                : hasFiles
                  ? "border-emerald-300 bg-emerald-50/50"
                  : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <UploadCloud
              size={24}
              className={dragging ? "text-indigo-500" : hasFiles ? "text-emerald-500" : "text-slate-400"}
            />
            <p className="mt-2 text-sm text-slate-600">
              {hasFiles
                ? `${files.length} file${files.length > 1 ? "s" : ""} selected · ${formatBytes(totalSize)}`
                : "Click to choose files or drag them here"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              PDF, DOCX, XLSX, JPG, PNG · max {MAX_SIZE / 1024 / 1024} MB each · up to {MAX_FILES} files
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {hasFiles && (
            <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-200">
              {files.map((f, i) => (
                <li
                  key={fileKey(f)}
                  className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0"
                >
                  <FileText size={15} className="shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-700" title={f.name}>
                    {f.name}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{formatBytes(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
