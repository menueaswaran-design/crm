"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { apiFetch, patchData } from "@/lib/client";

function initials(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function AssignStaffModal({ open, onClose, client, onAssigned }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelected("");
    setError("");
    setSaving(false);
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const json = await apiFetch("/api/users");
        if (!cancelled) setStaff((json.data || []).filter((u) => u.role === "staff"));
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, client]);

  const assign = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await patchData(`/api/clients/${client._id}`, { assignedStaff: selected });
      onAssigned?.();
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign Staff"
      description={
        client ? `${client.name}${client.clientCode ? ` (${client.clientCode})` : ""}. Pick a staff member to assign.` : ""
      }
      maxWidth="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={assign} loading={saving} disabled={!selected}>
            {saving ? "Assigning..." : "Assign Staff"}
          </Button>
        </div>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-700">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">
          No staff members found. Add staff in the Staff section first.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto -mx-1 px-1">
          {staff.map((u) => {
            const active = selected === u._id;
            return (
              <button
                key={u._id}
                type="button"
                onClick={() => setSelected(u._id)}
                className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "border-indigo-300 bg-indigo-50 text-indigo-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {initials(u.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">{u.name}</span>
                  <span className="block text-xs text-slate-500 truncate">{u.email || "—"}</span>
                </span>
                {active && <Check size={16} className="shrink-0 text-indigo-600" />}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}