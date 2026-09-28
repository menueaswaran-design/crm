/**
 * Client.assignedStaff holds an array of User ids. API reads populate them with
 * `name email role`, so the same field arrives either as populated objects or as
 * raw ids depending on the query. These helpers normalise both shapes so no call
 * site has to guess which one it received.
 *
 * Safe to import from both server routes and client components.
 */

export function assignedStaffList(value) {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

export function assignedStaffIds(value) {
  return assignedStaffList(value).map((s) => String(s?._id || s));
}

export function isAssignedToUser(client, user) {
  if (!client || !user?._id) return false;
  return assignedStaffIds(client.assignedStaff).includes(String(user._id));
}

export function assignedStaffNames(value, fallback = "Unassigned") {
  const names = assignedStaffList(value)
    .map((s) => (s && typeof s === "object" ? s.name : null))
    .filter(Boolean);
  return names.length ? names.join(", ") : fallback;
}

/** Matches clients nobody is assigned to, including pre-migration rows. */
export const UNASSIGNED_STAFF_QUERY = {
  $or: [
    { assignedStaff: { $size: 0 } },
    { assignedStaff: null },
    { assignedStaff: { $exists: false } },
  ],
};

/** Matches clients with at least one staff member. */
export const HAS_STAFF_QUERY = { "assignedStaff.0": { $exists: true } };
