"use client";

import { useState, useEffect } from "react";
import { Phone, AlertCircle } from "lucide-react";
import WhatsAppIcon from "./WhatsAppIcon";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { normalizeIndianPhone } from "@/lib/phone";
import { createWhatsAppUrl } from "@/lib/whatsapp";
import { logWhatsAppOpen } from "@/lib/whatsappLog";

export default function WhatsAppMessageModal({
  open,
  onClose,
  client,
  initialMessage = "",
  clientId,
  messageType = "CUSTOM_MESSAGE",
}) {
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setMessage(initialMessage);
      setError("");
    }
  }, [open, initialMessage]);

  const phoneResult = client?.phone ? normalizeIndianPhone(client.phone) : null;
  const phoneValid = phoneResult?.valid;
  const formattedPhone = phoneValid
    ? `+${phoneResult.phone.slice(0, 2)} ${phoneResult.phone.slice(2)}`
    : client?.phone || "—";

  const handleOpen = () => {
    setError("");

    if (!phoneValid) {
      setError("Invalid or missing phone number. Please update the client's phone number.");
      return;
    }

    if (!message.trim()) {
      setError("Message cannot be empty.");
      return;
    }

    try {
      const url = createWhatsAppUrl({
        phone: client.phone,
        message: message.trim(),
      });
      window.open(url, "_blank", "noopener,noreferrer");
      if (clientId) {
        logWhatsAppOpen({
          clientId,
          messageType,
          clientName: client?.name,
        });
      }
      onClose();
    } catch (err) {
      setError(err.message || "Could not create WhatsApp URL.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="WhatsApp Message"
      maxWidth="max-w-lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleOpen} disabled={!phoneValid}>
            <WhatsAppIcon size={15} /> Open WhatsApp
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <WhatsAppIcon size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {client?.name || "Client"}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Phone size={12} />
              {formattedPhone}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2.5 text-xs text-rose-700">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div>
          <label className="label-base">
            Message <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setError("");
            }}
            rows={10}
            className="input-base resize-y min-h-[160px]"
            placeholder="Type your WhatsApp message..."
          />
          <p className="mt-1 text-xs text-slate-400 text-right">
            {message.length} characters
          </p>
        </div>

        {!phoneValid && client?.phone && (
          <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-700">
            The phone number &quot;{client.phone}&quot; is not a valid Indian mobile number.
            Please update it in the client profile.
          </div>
        )}

        {!client?.phone && (
          <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-700">
            No phone number on file. Please add a phone number to the client profile first.
          </div>
        )}
      </div>
    </Modal>
  );
}
