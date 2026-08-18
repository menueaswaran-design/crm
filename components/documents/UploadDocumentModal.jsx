"use client";

import { useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { Select } from "@/components/common/Field";
import { apiFetch } from "@/lib/client";
import { DOCUMENT_CATEGORIES } from "@/lib/utils";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPT = ".pdf,.docx,.xlsx,.xls,.jpg,.jpeg,.png";

export default function UploadDocumentModal({ open, onClose, onUploaded, clientId }) {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(clientId || "");
  const [category, setCategory] = useState("GST");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedClient(clientId || "");
      setCategory("GST");
      setFile(null);
      setError("");
      (async () => {
        try {
          const json = await apiFetch("/api/clients?limit=100");
          setClients(json.data || []);
        } catch {
          // ignore
        }
      })();
    }
  }, [open, clientId]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setError("");
    if (!f) return;
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    const allowed = ["pdf", "docx", "xlsx", "xls", "jpg", "jpeg", "png"];
    if (!allowed.includes(ext)) {
      setError("Unsupported file type. Allowed: PDF, DOCX, XLSX, JPG, PNG.");
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

  const handleUpload = async () => {
    setError("");
    if (!selectedClient) return setError("Please select a client.");
    if (!file) return setError("Please choose a file.");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("clientId", selectedClient);
      formData.append("category", category);
      formData.append("file", file);

      const json = await apiFetch("/api/documents", { method: "POST", body: formData });
      onUploaded(json.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload Document"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={handleUpload} loading={loading}>
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-700">{error}</div>
        )}

        <Select label="Client" required value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
          <option value="">Select client...</option>
          {clients.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select label="Category" required value={category} onChange={(e) => setCategory(e.target.value)}>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <div>
          <label className="label-base">
            Select File <span className="text-rose-500"> *</span>
          </label>
          <label
            className={`flex flex-col items-center justify-center border border-dashed rounded-lg p-5 cursor-pointer transition-colors ${
              file ? "border-emerald-300 bg-emerald-50/50" : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <UploadCloud size={24} className={file ? "text-emerald-500" : "text-slate-400"} />
            <p className="mt-2 text-sm text-slate-600">
              {file ? file.name : "Click to choose a file"}
            </p>
            <p className="text-xs text-slate-400 mt-1">PDF, DOCX, XLSX, JPG, PNG · max 10 MB</p>
            <input type="file" accept={ACCEPT} className="hidden" onChange={handleFileChange} />
          </label>
        </div>
      </div>
    </Modal>
  );
}
