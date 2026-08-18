/**
 * Shared helpers used across API routes and UI.
 */

export const now = () => new Date();

export function formatINR(amount) {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function daysRemaining(dueDate) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function maskAadhaar(aadhaar) {
  if (!aadhaar) return "—";
  const digits = aadhaar.replace(/\D/g, "");
  if (digits.length !== 12) return aadhaar;
  return `XXXX XXXX ${digits.slice(8)}`;
}

export function isValidPAN(pan) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test((pan || "").toUpperCase());
}

export function isValidGSTIN(gstin) {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
    (gstin || "").toUpperCase()
  );
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim());
}

export function isValidIndianPhone(phone) {
  return /^(\+91[\s-]?)?[0]?[6-9]\d{9}$/.test((phone || "").trim());
}

export function getErrorMessage(error, fallback) {
  if (!error) return fallback || "Something went wrong.";
  if (error.message) return error.message;
  return fallback || "Something went wrong.";
}

export function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export const CLIENT_CATEGORIES = [
  "Individual",
  "Proprietor",
  "Pvt Ltd",
  "LLP",
  "Partnership",
  "HUF",
  "Other",
];

export const COMPLIANCE_TYPES = [
  "GSTR-1",
  "GSTR-3B",
  "GSTR-9",
  "GSTR-9C",
  "TDS Return",
  "ITR",
  "Advance Tax",
  "ROC Filing",
  "PF",
  "ESI",
  "Other",
];

export const COMPLIANCE_CATEGORIES = [
  "GST",
  "Income Tax",
  "TDS",
  "ROC",
  "PF",
  "ESI",
  "Other",
];

export const DOCUMENT_CATEGORIES = [
  "GST",
  "Income Tax",
  "Bank Statement",
  "TDS",
  "ROC",
  "KYC",
  "Invoices",
  "Other",
];

export const INVOICE_SERVICE_TYPES = [
  "GST Filing",
  "ITR Filing",
  "Tax Consultation",
  "Accounting",
  "Bookkeeping",
  "Audit",
  "TDS Filing",
  "ROC Compliance",
  "Payroll",
  "Other",
];

export const PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "BANK",
  "CHEQUE",
  "OTHER",
];

export const STATUS_COLORS = {
  PENDING: "yellow",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
  OVERDUE: "red",
  PAID: "green",
  PARTIAL: "blue",
  ACTIVE: "green",
  INACTIVE: "gray",
};

export const PRIORITY_COLORS = {
  LOW: "gray",
  MEDIUM: "blue",
  HIGH: "red",
};

export function toCamelCase(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase());
}

export function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
