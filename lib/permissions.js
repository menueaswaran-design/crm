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

/** First navigation route the user is allowed to open after login. */
export function getDefaultRoute(user) {
  if (!user) return "/login";
  if (user.role === "staff" && hasPermission(user, "tasks")) {
    return "/tasks";
  }
  const first = NAV_PERMISSIONS.find((p) => hasPermission(user, p.key));
  return first?.href || "/login";
}

/** Whether the user may open this app path (login redirect safety). */
export function canAccessPath(user, pathname) {
  if (!user) return false;
  const clean = (pathname || "").split("?")[0];
  const segment = `/${(clean.split("/")[1] || "")}`;

  if (segment === "/staff") return user.role === "admin";

  const perm = NAV_PERMISSIONS.find((p) => p.href === segment)?.key;
  if (!perm) return true;
  return hasPermission(user, perm);
}

/** Pick a safe post-login destination respecting staff permissions. */
export function resolvePostLoginRedirect(user, requestedPath) {
  if (!user) return "/login";
  const path = (requestedPath || "").split("?")[0];
  if (path && canAccessPath(user, path)) return path;
  return getDefaultRoute(user);
}

/**
 * Whether the user may see financial data on the dashboard
 * (Total Revenue / Amount Received / Outstanding cards + Revenue Overview chart).
 * Admins always see it; staff only when the admin enables the toggle.
 */
export function canViewFinancials(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.dashboardFinancials === true;
}
