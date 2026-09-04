import dbConnect from "@/lib/mongodb";
import { logActivity } from "@/lib/activity";
import { ok, fail, handleError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

const VALID_MESSAGE_TYPES = [
  "CLIENT_MESSAGE",
  "DOCUMENT_REQUEST",
  "COMPLIANCE_REMINDER",
  "COMPLIANCE_OVERDUE",
  "PAYMENT_REMINDER",
  "TASK_REMINDER",
  "CUSTOM_MESSAGE",
];

export async function POST(request) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    const body = await request.json();
    const { clientId, messageType, clientName } = body;

    if (!clientId) {
      return fail("Client ID is required", 400);
    }

    if (!messageType || !VALID_MESSAGE_TYPES.includes(messageType)) {
      return fail("Invalid message type", 400);
    }

    // Log the WhatsApp message open event.
    // We do NOT store the actual message content for privacy reasons.
    await logActivity({
      userId: user._id,
      companyId: user.companyId,
      action: "WHATSAPP_MESSAGE_OPENED",
      entityType: "Client",
      entityId: clientId,
      description: `WhatsApp message opened for ${clientName || "client"}`,
      metadata: {
        messageType,
      },
    });

    return ok({ logged: true });
  } catch (error) {
    return handleError(error);
  }
}
