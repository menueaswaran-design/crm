"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, AlertTriangle, Users } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { apiFetch, patchData, postData } from "@/lib/client";
import { assignedStaffIds } from "@/lib/clientAssignment";
import { useAuth } from "@/context/AuthContext";

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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [mode, setMode] = useState("client");
  const [bulkStaffId, setBulkStaffId] = useState("");
  const [clientCount, setClientCount] = useState(null);
  const [confirmingBulk, setConfirmingBulk] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(assignedStaffIds(client?.assignedStaff));
    setError("");
    setSaving(false);
    setMode("client");
    setBulkStaffId("");
    setConfirmingBulk(false);

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [staffJson, countJson] = await Promise.all([
          apiFetch("/api/users"),
          isAdmin ? apiFetch("/api/clients?limit=1") : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setStaff((staffJson.data || []).filter((u) => u.role === "staff"));
        setClientCount(countJson?.pagination?.total ?? null);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, client, isAdmin]);

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const saveClient = async () => {
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

  const assignAll = async () => {
    setSaving(true);
    setError("");
    try {
      await postData("/api/clients/assign-all", { staffId: bulkStaffId });
      onAssigned?.();
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
      setConfirmingBulk(false);
    }
  };

  const bulkName = staff.find((u) => u._id === bulkStaffId)?.name;
  const changed =
    assignedStaffIds(client?.assignedStaff).slice().sort().join() !==
    selected.slice().sort().join();

  const backToClient = () => {
    setMode("client");
    setError("");
    setConfirmingBulk(false);
  };

  const pickBulk = (id) => {
    setBulkStaffId(id);
    setConfirmingBulk(false);
  };

  const title = mode === "client" ? "Assign Staff" : "Assign All Clients";
  const description =
    mode === "client"
      ? `${client?.name || ""}${client?.clientCode ? ` (${client.clientCode})` : ""} — pick one or more staff members.`
      : "Pick one staff member. Every active client will be assigned to them, replacing current assignments.";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            type="button"
            onClick={mode === "all" ? backToClient : onClose}
          >
            {mode === "client" ? "Cancel" : "Back"}
          </Button>
          {mode === "client" ? (
            <Button onClick={saveClient} loading={saving} disabled={!changed}>
              {saving ? "Saving..." : "Save Assignment"}
            </Button>
          ) : confirmingBulk ? (
            <Button variant="danger" onClick={assignAll} loading={saving}>
              {saving ? "Assigning..." : `Yes, assign all ${clientCount ?? ""} client(s) to ${bulkName}`}
            </Button>
          ) : (
            <Button onClick={() => setConfirmingBulk(true)} disabled={!bulkStaffId}>
              Assign all clients
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {isAdmin && (
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {[
              { key: "client", label: "This client", icon: Users },
              { key: "all", label: "All clients", icon: AlertTriangle },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setMode(tab.key);
                  setError("");
                  setConfirmingBulk(false);
                }}                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === tab.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {mode === "all" && (
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
            {clientCount === null ? (
              "This replaces the current staff on every client in your company."
            ) : (
              <>
                This will replace the current staff on all{" "}
                <span className="font-semibold">{clientCount} client(s)</span> in your company.
                Unassigned clients will be included.
              </>
            )}
          </div>
        )}

        {mode === "client" && selected.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {selected.length} staff member{selected.length === 1 ? "" : "s"} selected
            </p>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-xs font-medium text-rose-600 hover:text-rose-700"
            >
              Clear all
            </button>
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
              const active = mode === "client" ? selected.includes(u._id) : bulkStaffId === u._id;
              return (
                <button
                  key={u._id}
                  type="button"
                onClick={() => {
                  if (mode === "client") toggle(u._id);
                  else pickBulk(u._id);
                }}
                  className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "border-indigo-300 bg-brand-50 text-indigo-900"
                      : "border-hairline bg-white text-slate-700 hover:border-hairline-strong hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                      active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {initials(u.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{u.name}</span>
                    <span className="block text-xs text-slate-500 truncate">{u.email || "—"}</span>
                  </span>
                  {active && <Check size={16} className="shrink-0 text-brand-600" />}
                </button>
              );
            })}
          </div>
        )}

        {confirmingBulk && mode === "all" && (
          <p className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">
            This cannot be undone. Confirm to assign every client to{" "}
            <span className="font-semibold">{bulkName}</span>.
          </p>
        )}
      </div>
    </Modal>
  );
}
