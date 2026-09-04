import Activity from "@/models/Activity";

export async function logActivity({ userId, companyId, action, entityType, entityId, description, metadata }) {
  try {
    await Activity.create({
      userId,
      companyId: companyId || null,
      action,
      entityType,
      entityId,
      description,
      metadata,
    });
  } catch (error) {
    // Activity logging should never break the primary operation.
    console.error("Failed to log activity:", error.message);
  }
}
