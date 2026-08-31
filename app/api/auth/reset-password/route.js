import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { fail, ok } from "@/lib/api";
import { hashToken, hashPassword } from "@/lib/password";
import { firebaseAuthRequest } from "@/lib/firebaseAuthRest";

function getFirebaseApiKey() {
  return process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
}

/**
 * Consumes a password-reset code/token and sets a new password.
 * - `code`  → Firebase OOB code (from Firebase's reset email).
 * - `token` → CRM-local reset token (from our SMTP reset email).
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { code, token } = body || {};
    const password = String(body?.password || "");

    if (password.length < 6) {
      return fail("Password must be at least 6 characters.", 400);
    }

    if (code) {
      const apiKey = getFirebaseApiKey();
      if (!apiKey) {
        return fail("Unable to reset the password via this link.", 400);
      }
      try {
        await firebaseAuthRequest("resetPassword", {
          oobCode: String(code),
          newPassword: password,
        });
        return ok(null, "Password updated. You can now sign in with your new password.");
      } catch (err) {
        const msg = String(err?.message || "");
        if (msg.includes("INVALID_OOB_CODE") || msg.includes("EXPIRED_OOB_CODE")) {
          return fail("This reset link is invalid or has expired. Request a new one.", 400);
        }
        return fail(msg || "Unable to reset the password.", 502);
      }
    }

    if (!token) return fail("Missing reset code.", 400);

    await dbConnect();
    const tokenHash = hashToken(String(token));
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return fail("This reset link is invalid or has expired. Request a new one.", 400);
    }

    user.passwordHash = await hashPassword(password);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return ok(null, "Password updated. You can now sign in with your new password.");
  } catch (error) {
    console.error("[reset-password] error:", error);
    return fail("Unable to reset the password. Please try again.", 500);
  }
}