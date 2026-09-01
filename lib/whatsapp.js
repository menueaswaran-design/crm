/**
 * WhatsApp click-to-chat URL generator.
 * Uses the official wa.me URL format — no API credentials required.
 */

import { normalizeIndianPhone } from "@/lib/phone";

/**
 * Create a WhatsApp click-to-chat URL.
 *
 * @param {Object} options
 * @param {string} options.phone - Indian phone number (any common format)
 * @param {string} options.message - Plain text message to pre-fill
 * @returns {string} wa.me URL
 * @throws {Error} If phone number is invalid
 */
export function createWhatsAppUrl({ phone, message }) {
  const result = normalizeIndianPhone(phone);

  if (!result.valid) {
    throw new Error(result.reason || "Invalid WhatsApp number");
  }

  const encodedMessage = encodeURIComponent(message || "");
  return `https://wa.me/${result.phone}?text=${encodedMessage}`;
}
