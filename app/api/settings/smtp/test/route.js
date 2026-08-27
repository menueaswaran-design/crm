import { ok, fail, handleError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { sendTestEmail, isSmtpConfigured, getSmtpConfig } from "@/lib/smtp";

export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const to = String(body.to || "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return fail("Enter a valid email address to send the test to.", 400);
    }

    const cfg = await getSmtpConfig();
    if (!isSmtpConfigured(cfg)) {
      return fail("SMTP is not configured. Fill in the details and enable it before testing.", 400);
    }

    await sendTestEmail(to);
    return ok(null, `Test email sent to ${to}. Check the inbox (and spam folder).`);
  } catch (error) {
    return fail(error.message || "Test email failed.", 400);
  }
}