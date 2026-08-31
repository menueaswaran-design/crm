import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { fail } from "@/lib/api";
import { isMailConfigured, sendMail, getResetEmailHtml } from "@/lib/mail";
import { generateResetToken, hashToken } from "@/lib/password";
import { firebaseAuthRequest } from "@/lib/firebaseAuthRest";
import { isValidEmail } from "@/lib/utils";

function getAppUrl(request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const origin = request?.headers?.get("origin");
  if (origin) return origin.replace(/\/+$/, "");
  return "http://localhost:3000";
}

function getTokenTtlMinutes() {
  const raw = Number(process.env.RESET_TOKEN_TTL_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 60;
}

function getFirebaseApiKey() {
  return process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
}

/**
 * Reset-password flow.
 * 1. "Login mail check": only proceeds when the email matches a CRM login.
 * 2. Sends the reset email to that login address via Firebase (when the account
 *    is Firebase-registered) or SMTP (local reset token) otherwise.
 * Always answers with a generic message to avoid account enumeration.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").toLowerCase().trim();

    if (!isValidEmail(email)) return fail("Enter a valid email address.", 400);

    await dbConnect();

    const generic = {
      success: true,
      message:
        "If an account exists for that email, a reset link has been sent.",
    };

    const user = await User.findOne({ email }).lean();
    if (!user) return NextResponse.json(generic);

    const appUrl = getAppUrl(request);
    const apiKey = getFirebaseApiKey();

    // Firebase-registered account → Firebase emails the reset link directly.
    if (apiKey) {
      try {
        await firebaseAuthRequest("sendOobCode", {
          requestType: "PASSWORD_RESET",
          email,
          continueUrl: `${appUrl}/login`,
        });
        return NextResponse.json({ ...generic, sent: true, channel: "firebase" });
      } catch (firebaseError) {
        // Not a Firebase account (or Firebase email sending unavailable) →
        // fall through to the SMTP/local token path.
        console.error("[forgot-password] Firebase reset mail unavailable:", firebaseError?.message);
      }
    }

    // Local reset token with our own SMTP delivery.
    const token = generateResetToken();
    const ttlMs = getTokenTtlMinutes() * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordTokenHash: hashToken(token),
          resetPasswordExpires: expiresAt,
        },
      }
    );

    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    if (isMailConfigured()) {
      try {
        await sendMail({
          to: email,
          subject: "Reset your CA Office CRM password",
          html: getResetEmailHtml({ resetUrl, expiresAt }),
        });
        return NextResponse.json({ ...generic, sent: true, channel: "smtp" });
      } catch (mailError) {
        console.error("[forgot-password] SMTP send failed:", mailError);
        return fail(
          "We couldn't send the reset email right now. Please try again later.",
          502
        );
      }
    }

    // No delivery channel — expose the link in server logs only (dev fallback).
    console.log(`[forgot-password] Reset link for ${email}: ${resetUrl}`);
    return NextResponse.json({
      ...generic,
      sent: false,
      hint:
        "No email service is configured (Firebase or SMTP). Contact the admin to reset this account.",
    });
  } catch (error) {
    console.error("[forgot-password] error:", error);
    return NextResponse.json(
      {
        success: true,
        message:
          "If an account exists for that email, a reset link has been sent.",
      },
      { status: 200 }
    );
  }
}