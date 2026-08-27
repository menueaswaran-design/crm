import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";
import { ok, fail, handleError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

const SMTP_SETTINGS_ID = "smtp-settings";

function sanitizeSmtp(smtp = {}) {
  return {
    host: smtp.host || "",
    port: Number(smtp.port) || 587,
    secure: smtp.secure === true,
    user: smtp.user || "",
    fromName: smtp.fromName || "CA Office CRM",
    fromEmail: smtp.fromEmail || "",
    enabled: smtp.enabled === true,
  };
}

export async function GET(request) {
  try {
    await dbConnect();
    await requireAdmin(request);

    const doc = await Settings.findById(SMTP_SETTINGS_ID).lean();
    const smtp = sanitizeSmtp(doc?.smtp);

    return ok({
      ...smtp,
      // Never send the password back to the client.
      pass: "",
      hasPassword: Boolean(doc?.smtp?.pass || process.env.SMTP_PASS),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request) {
  try {
    await dbConnect();
    await requireAdmin(request);
    const body = await request.json();

    const current = await Settings.findById(SMTP_SETTINGS_ID).lean();
    const prev = current?.smtp || {};

    const smtp = {
      host: String(body.host || "").trim(),
      port: Math.max(1, Number(body.port) || 587),
      secure: body.secure === true,
      user: String(body.user || "").trim(),
      // Keep the existing password when a new one wasn't typed.
      pass:
        body.pass && String(body.pass).trim() !== ""
          ? String(body.pass)
          : prev.pass || "",
      fromName: String(body.fromName || "CA Office CRM").trim(),
      fromEmail: String(body.fromEmail || "").trim().toLowerCase(),
      enabled: body.enabled === true,
    };

    if (!smtp.host || !smtp.user || !smtp.fromEmail) {
      return fail("SMTP host, username and from-email are required.", 400);
    }
    if (smtp.enabled && !smtp.pass) {
      return fail("SMTP password is required when email sending is enabled.", 400);
    }

    await Settings.findOneAndUpdate(
      { _id: SMTP_SETTINGS_ID },
      { $set: { smtp } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return ok(
      {
        ...smtp,
        pass: "",
        hasPassword: Boolean(smtp.pass),
      },
      "SMTP settings saved successfully."
    );
  } catch (error) {
    return handleError(error);
  }
}