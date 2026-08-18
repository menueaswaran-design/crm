import Notification from "@/models/Notification";

export async function createNotification({ userId, type, title, message, entityType, entityId }) {
  if (!userId) return null;
  try {
    return await Notification.create({ userId, type, title, message, entityType, entityId, isRead: false });
  } catch (error) {
    console.error("Failed to create notification:", error.message);
    return null;
  }
}

export async function notifyStaff(userIds, payload) {
  if (!Array.isArray(userIds)) return;
  for (const userId of userIds) {
    if (userId) await createNotification({ userId, ...payload });
  }
}
