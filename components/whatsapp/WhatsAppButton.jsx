"use client";

import { useState } from "react";
import WhatsAppIcon from "./WhatsAppIcon";
import WhatsAppMessageModal from "./WhatsAppMessageModal";

/**
 * Reusable WhatsApp button that opens a preview/edit modal
 * and then launches WhatsApp with a pre-filled message.
 *
 * Props:
 *   phone       - client phone number
 *   message     - pre-filled message text
 *   client      - client object { name, phone }
 *   label       - button label (default: "WhatsApp")
 *   messageType - audit log message type (default: "CUSTOM_MESSAGE")
 *   clientId    - client MongoDB ObjectId for audit logging
 *   variant     - Button variant (default: "secondary")
 *   size        - Button size (default: "sm")
 *   disabled    - disable the button
 *   className   - additional CSS classes
 */
export default function WhatsAppButton({
  phone,
  message = "",
  client,
  label = "WhatsApp",
  messageType = "CUSTOM_MESSAGE",
  clientId,
  iconOnly = false,
  variant = "secondary",
  size = "sm",
  disabled = false,
  className = "",
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpen = () => {
    setModalOpen(true);
  };

  const clientData = client || { name: "", phone: phone || "" };

  const buttonClass = iconOnly
    ? `inline-flex items-center justify-center rounded-md p-2 text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 focus-visible:ring-emerald-400 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${className}`
    : `inline-flex items-center gap-1.5 font-medium rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none whitespace-nowrap text-xs px-3 py-2 bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-400 ${className}`;

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={disabled || !phone}
        className={buttonClass}
        title={!phone ? "No phone number on file" : label}
        aria-label={label}
      >
        <WhatsAppIcon size={iconOnly ? 16 : 14} />
        {!iconOnly && label}
      </button>

      <WhatsAppMessageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        client={clientData}
        initialMessage={message}
        clientId={clientId}
        messageType={messageType}
      />
    </>
  );
}
