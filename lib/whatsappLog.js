/**
 * Client-side helper to log WhatsApp message opens via the server API.
 * This never blocks the primary UX — failures are silently ignored.
 */

import { apiFetch } from "@/lib/client";

/**
 * Log a WhatsApp message open event to the activity audit log.
 *
 * @param {Object} options
 * @param {string} options.clientId - Client MongoDB ObjectId
 * @param {string} options.messageType - One of: CLIENT_MESSAGE, DOCUMENT_REQUEST, COMPLIANCE_REMINDER, COMPLIANCE_OVERDUE, PAYMENT_REMINDER, TASK_REMINDER, CUSTOM_MESSAGE
 * @param {string} [options.clientName] - Client name for description (optional, not stored in metadata)
 */
export async function logWhatsAppOpen({ clientId, messageType, clientName }) {
  try {
    await apiFetch("/api/whatsapp/log", {
      method: "POST",
      body: JSON.stringify({ clientId, messageType, clientName }),
    });
  } catch {
    // Activity logging should never break the primary operation.
  }
}
