/**
 * Navigation / module permissions.
 * Admins always have access to everything.
 * Staff access is controlled per-module by the `permissions` array on the
 * User document (managed by the admin in Staff edit form). The "Staff"
 * module itself is always admin-only and not togglable.
 */

export const NAV_PERMISSIONS = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", description: "Revenue, charts & practice overview" },
  { key: "clients", label: "Clients", href: "/clients", description: "View & manage client records" },
  { key: "compliance", label: "Compliance", href: "/compliance", description: "Filings, due dates & reminders" },
  { key: "tasks", label: "Tasks", href: "/tasks", description: "Task board" },
  { key: "documents", label: "Documents", href: "/documents", description: "Client documents" },
  { key: "invoices", label: "Invoices", href: "/invoices", description: "Billing & payments" },
];

export const DEFAULT_STAFF_PERMISSIONS = ["clients", "compliance", "tasks"];

const VALID_KEYS = new Set(NAV_PERMISSIONS.map((p) => p.key));

export function isValidPermissionKey(key) {
  return VALID_KEYS.has(key);
}

export function sanitizePermissions(input) {
  if (!Array.isArray(input)) return null;
  return [...new Set(input.filter((k) => VALID_KEYS.has(k)))];
}

/**
 * Resolve the effective permission list for a user.
 * - admin => every module
 * - staff with saved permissions => that list
 * - staff without saved permissions => safe defaults
 */
export function effectivePermissions(user) {
  if (!user) return [];
  if (user.role === "admin") return NAV_PERMISSIONS.map((p) => p.key);
  if (Array.isArray(user.permissions)) {
    return user.permissions.filter((k) => VALID_KEYS.has(k));
  }
  return DEFAULT_STAFF_PERMISSIONS;
}

export function hasPermission(user, key) {
  if (!key) return true;
  return effectivePermissions(user).includes(key);
}
