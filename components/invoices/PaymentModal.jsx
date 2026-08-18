"use client";

import { useState } from "react";
import { Wallet, Banknote } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { Input, Select, Textarea } from "@/components/common/Field";
import { postData } from "@/lib/client";
import { formatINR, PAYMENT_METHODS } from "@/lib/utils";

export default function PaymentModal({ invoice, onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("BANK");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const outstanding = Math.max(0, (invoice?.totalAmount || 0) - (invoice?.paidAmount || 0));

  const handleSubmit = async () => {
    setError("");
    const value = Number(amount);
    if (!value || value <= 0) return setError("Enter a valid payment amount.");
    if (value > outstanding) return setError(`Amount exceeds outstanding balance of ${formatINR(outstanding)}.`);

    setLoading(true);
    try {
      await postData(`/api/invoices/${invoice._id}/payments`, {
        amount: value,
        paymentDate,
        paymentMethod,
        referenceNumber,
        notes,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      title="Record Payment"
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            <Banknote size={14} /> {loading ? "Recording..." : "Record Payment"}
          </Button>
        </div>
      }
    >
      {invoice && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 p-3.5">
            <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Wallet size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{invoice.invoiceNumber}</p>
              <p className="text-xs text-slate-500">
                Outstanding: <span className="font-medium text-slate-800">{formatINR(outstanding)}</span>
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">{error}</div>
          )}

          <Input label="Amount (₹)" type="number" min="0" required placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input label="Payment Date" type="date" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          <Select label="Payment Method" required value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          <Input label="Reference Number" placeholder="UTR / cheque no." value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
          <Textarea label="Notes" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      )}
    </Modal>
  );
}
