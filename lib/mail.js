import nodemailer from "nodemailer";

let transporter = null;

export function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function getMailConfig() {
  return {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "",
  };
}

function getTransporter() {
  if (!isMailConfigured()) return null;
  if (transporter) return transporter;
  const cfg = getMailConfig();
  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const transport = getTransporter();
  if (!transport) throw new Error("SMTP is not configured.");
  const cfg = getMailConfig();
  const from = cfg.from || `"CA Office CRM" <${cfg.user}>`;
  return transport.sendMail({ from, to, subject, html, text });
}

export function getResetEmailHtml({ resetUrl, expiresAt, appName = "CA Office CRM" }) {
  const expiresLabel = expiresAt
    ? expiresAt.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;">
      <div style="background:linear-gradient(135deg,#4f46e5,#4338ca);border-radius:12px;padding:24px;color:#ffffff;">
        <div style="font-size:18px;font-weight:700;">${appName}</div>
        <div style="font-size:13px;opacity:.8;margin-top:2px;">Professional Accounting Solutions</div>
      </div>
      <div style="padding:24px;border:1px solid #e2e8f0;border-radius:12px;margin-top:16px;">
        <h2 style="margin:0 0 8px;font-size:18px;">Reset your password</h2>
        <p style="font-size:14px;line-height:1.6;color:#334155;">We received a request to reset the password for your ${appName} account. Click the button below to choose a new password. This link expires ${
          expiresLabel ? `on ${expiresLabel}` : "in 1 hour"
        }.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 22px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Reset password</a>
        <p style="font-size:13px;color:#64748b;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color:#4f46e5;word-break:break-all;">${resetUrl}</a></p>
        <p style="font-size:12px;color:#94a3b8;line-height:1.5;margin-top:16px;">If you didn't request this, you can safely ignore this email — your password will not change.</p>
      </div>
    </div>
  `;
}