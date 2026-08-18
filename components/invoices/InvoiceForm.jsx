"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { Input, Select, Textarea } from "@/components/common/Field";
import { postData, patchData, apiFetch } from "@/lib/client";
import { INVOICE_SERVICE_TYPES, formatINR } from "@/lib/utils";

export default function InvoiceForm({ open, onClose, invoice, onSaved }) {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [gstRate, setGstRate] = useState(18);
  const [items, setItems] = useState([{ description: "", serviceType: "GST Filing", quantity: 1, amount: 0 }]);
  const [notes, setNotes] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setServerError("");
      if (invoice) {
        setClientId(invoice.clientId?._id || invoice.clientId || "");
        setInvoiceDate(new Date(invoice.invoiceDate).toISOString().slice(0, 10));
        setDueDate(new Date(invoice.dueDate).toISOString().slice(0, 10));
        setGstRate(invoice.gstRate || 0);
        setItems(invoice.items?.length ? invoice.items.map((i) => ({ ...i })) : [{ description: "", serviceType: "GST Filing", quantity: 1, amount: 0 }]);
        setNotes(invoice.notes || "");
      } else {
        setClientId("");
        setInvoiceDate("");
        setDueDate("");
        setGstRate(18);
        setItems([{ description: "", serviceType: "GST Filing", quantity: 1, amount: 0 }]);
        setNotes("");
      }
      (async () => {
        try {
          const json = await apiFetch("/api/clients?limit=100");
          setClients(json.data || []);
        } catch {
          // ignore
        }
      })();
    }
  }, [open, invoice]);

  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.amount) || 0), 0);
  const gstAmount = Math.round((subtotal * (Number(gstRate) || 0)) / 100);
  const total = subtotal + gstAmount;

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { description: "", serviceType: "GST Filing", quantity: 1, amount: 0 }]);
  };

  const removeItem = (idx) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const handleSubmit = async () => {
    setServerError("");
    if (!clientId) return setServerError("Please select a client.");
    if (!invoiceDate || !dueDate) return setServerError("Invoice and due dates are required.");
    if (!items.length || items.some((it) => !it.description.trim())) {
      return setServerError("Every item needs a description.");
    }

    const payload = {
      clientId,
      invoiceDate,
      dueDate,
      gstRate: Number(gstRate) || 0,
      items: items.map((it) => ({
        description: it.description.trim(),
        serviceType: it.serviceType,
        quantity: Number(it.quantity) || 1,
        amount: Number(it.amount) || 0,
      })),
      notes,
    };

    setLoading(true);
    try {
      if (invoice) {
        await patchData(`/api/invoices/${invoice._id}`, payload);
      } else {
        await postData("/api/invoices", payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={invoice ? "Edit Invoice" : "Create Invoice"}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {loading ? "Creating..." : invoice ? "Save Changes" : "Create Invoice"}
          </Button>
        </div>
      }
    >
      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-700">
          {serverError}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Client" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Invoice Date" type="date" required value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            <Input label="Due Date" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-base mb-0">
              Invoice Items <span className="text-rose-500"> *</span>
            </label>
            <Button size="sm" variant="secondary" onClick={addItem}>
              <Plus size={14} /> Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                  />
                  <Select value={item.serviceType} onChange={(e) => updateItem(idx, "serviceType", e.target.value)}>
                    {INVOICE_SERVICE_TYPES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex gap-2 items-end">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                  />
                  <Input
                    type="number"
                    min="0"
                    placeholder="Amount (₹)"
                    value={item.amount}
                    onChange={(e) => updateItem(idx, "amount", e.target.value)}
                  />
                  <button
                    onClick={() => removeItem(idx)}
                    className="mb-1 p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="GST Rate (%)" type="number" min="0" max="100" value={gstRate} onChange={(e) => setGstRate(e.target.value)} />
          <Textarea label="Notes" placeholder="Optional notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <div className="rounded-lg bg-slate-50 p-4 text-sm space-y-1">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-medium">{formatINR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>GST {gstRate}%</span>
            <span className="font-medium">{formatINR(gstAmount)}</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-900 text-base pt-1 border-t border-slate-200">
            <span>Total</span>
            <span>{formatINR(total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
