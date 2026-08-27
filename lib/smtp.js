import nodemailer from "nodemailer";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";

const SMTP_SETTINGS_ID = "smtp-settings";

/**
 * Reads SMTP configuration from the Settings collection.
 * Falls back to SMTP_* env vars when the DB row is empty.
 */
export async function getSmtpConfig() {
  await dbConnect();
  const doc = await Settings.findById(SMTP_SETTINGS_ID).lean();

  const saved = doc?.smtp || {};

  return {
    host: saved.host || process.env.SMTP_HOST || "",
    port: saved.port || Number(process.env.SMTP_PORT || 587),
    secure: saved.secure ?? process.env.SMTP_SECURE === "true",
    user: saved.user || process.env.SMTP_USER || "",
    pass: saved.pass || process.env.SMTP_PASS || "",
    fromName: saved.fromName || process.env.SMTP_FROM_NAME || "CA Office CRM",
    fromEmail: saved.fromEmail || process.env.SMTP_FROM || "",
    enabled: saved.enabled ?? false,
  };
}

export function isSmtpConfigured(cfg) {
  return Boolean(cfg && cfg.enabled && cfg.host && cfg.user && cfg.pass && cfg.fromEmail);
}

/**
 * Sends an email through the configured SMTP account (nodemailer).
 * Returns { ok: true } on success or throws on failure.
 */
export async function sendEmail({ to, subject, text, html }) {
  const cfg = await getSmtpConfig();
  if (!isSmtpConfigured(cfg)) {
    throw new Error("SMTP is not configured. Ask an admin to set it up in Settings.");
  }
  if (!to) throw new Error("No recipient email provided.");

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
    to,
    subject,
    text,
    html,
  });
}

/**
 * Friendly test that also verifies SMTP login + send.
 */
export async function sendTestEmail(to) {
  const cfg = await getSmtpConfig();
  if (!isSmtpConfigured(cfg)) {
    throw new Error("SMTP is not configured. Fill in the details and enable it first.");
  }
  await sendEmail({
    to,
    subject: "Test email from CA Office CRM",
    text: "This is a test email. If you received it, your SMTP settings are working.",
    html: "<p>This is a <strong>test email</strong> from CA Office CRM. If you received it, your SMTP settings are working.</p>",
  });
}