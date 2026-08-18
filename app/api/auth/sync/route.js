import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { ok, fail, handleError } from "@/lib/api";
import { verifyFirebaseIdToken } from "@/lib/auth";

/**
 * Links a valid Firebase ID token to a MongoDB CRM user.
 * - Updates firebaseUid if user exists by email
 * - Auto-creates admin when email matches ADMIN_EMAIL
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return fail("Missing auth token.", 401);

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(token);
    } catch {
      return fail("Invalid Firebase token.", 401);
    }

    const firebaseUid = decoded?.uid || decoded?.sub;
    const email = String(decoded?.email || "").toLowerCase().trim();
    if (!firebaseUid || !email) return fail("Token is missing user identity.", 401);

    await dbConnect();

    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const adminName = (process.env.ADMIN_NAME || "Admin").trim();

    let user = await User.findOne({ firebaseUid });
    if (!user) {
      user = await User.findOne({ email });
    }

    if (user) {
      user.firebaseUid = firebaseUid;
      user.email = email;
      if (!user.isActive) return fail("This account is inactive.", 403);
      // Env bootstrap admin always keeps admin role
      if (adminEmail && email === adminEmail) {
        user.role = "admin";
        if (!user.name) user.name = adminName;
      }
      await user.save();
    } else if (adminEmail && email === adminEmail) {
      user = await User.create({
        firebaseUid,
        name: adminName,
        email,
        role: "admin",
        isActive: true,
      });
    } else {
      return fail(
        "Account not found in CRM. Ask an admin to add your staff account first.",
        404
      );
    }

    return ok(
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        avatarUrl: user.avatarUrl,
      },
      "Account synced."
    );
  } catch (error) {
    return handleError(error);
  }
}
