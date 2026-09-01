/**
 * Indian phone number normalization and validation utility.
 * Converts various Indian phone formats to international format (91XXXXXXXXXX).
 */

/**
 * Normalize an Indian phone number to international format.
 * Accepts:
 *   9876543210        → 919876543210
 *   +91 9876543210    → 919876543210
 *   91 9876543210     → 919876543210
 *   919876543210      → 919876543210
 *   09876543210       → 919876543210
 *   +91-9876543210    → 919876543210
 *   098765-43210      → 919876543210
 *
 * Returns { valid: boolean, phone: string, reason?: string }
 */
export function normalizeIndianPhone(phone) {
  if (!phone || typeof phone !== "string") {
    return { valid: false, phone: "", reason: "Phone number is required" };
  }

  // Strip all non-digit characters
  let digits = phone.replace(/\D/g, "");

  // Remove leading zeros (e.g. 09876543210 → 9876543210)
  digits = digits.replace(/^0+/, "");

  // If starts with 91 and has 12 digits total, it's already international
  // If starts with 91 and has 10 digits after 91, fine
  if (digits.startsWith("91") && digits.length === 12) {
    // Already in correct format
  } else if (digits.startsWith("91") && digits.length === 11) {
    // Has country code but only 10-digit number with leading digit part of country code
    // e.g. "91" + "9876543210" = 12 digits, so this case shouldn't happen normally
    // But handle edge: "91" + "876543210" (11 digits) → invalid
    return { valid: false, phone: "", reason: "Invalid Indian mobile number" };
  } else if (digits.length === 10) {
    // 10-digit number without country code — prepend 91
    digits = "91" + digits;
  } else {
    return { valid: false, phone: "", reason: "Invalid Indian mobile number" };
  }

  // At this point digits should be exactly 12 characters starting with 91
  if (digits.length !== 12 || !digits.startsWith("91")) {
    return { valid: false, phone: "", reason: "Invalid Indian mobile number" };
  }

  // Validate mobile number part (digits 3-12): must start with 6-9
  const mobileDigit = digits.charAt(2);
  if (!"6789".includes(mobileDigit)) {
    return { valid: false, phone: "", reason: "Invalid Indian mobile number" };
  }

  return { valid: true, phone: digits };
}

/**
 * Check if a phone number is a valid Indian mobile number.
 * Returns boolean.
 */
export function isValidIndianPhone(phone) {
  return normalizeIndianPhone(phone).valid;
}
