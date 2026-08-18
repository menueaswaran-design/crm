import { AlertTriangle } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading, confirmLabel = "Delete", danger = true }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title || "Confirm"}
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {loading ? "Working..." : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            danger ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-600"
          }`}
        >
          <AlertTriangle size={16} />
        </div>
        <p className="pt-1.5 text-sm text-slate-600">{message}</p>
      </div>
    </Modal>
  );
}
