import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import LoginHistory from "@/models/LoginHistory";
import Notification from "@/models/Notification";
import { createNotification } from "@/lib/notifications";
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
    const firebaseName = String(decoded?.name || "").trim();
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
      if (firebaseName && !user.name) user.name = firebaseName;
      if (!user.isActive) return fail("This account is inactive.", 403);
      if (adminEmail && email === adminEmail) {
        user.role = "superAdmin";
        if (!user.name) user.name = adminName;
      }
      await user.save();
    } else if (adminEmail && email === adminEmail) {
      user = await User.create({
        firebaseUid,
        name: firebaseName || adminName,
        email,
        role: "superAdmin",
        isActive: true,
      });
    } else {
      return fail(
        "Account not found in CRM. Ask an admin to add your staff account first.",
        404
      );
    }

    const loginAt = new Date();
    user.lastLoginAt = loginAt;
    await user.save();

    if (user.companyId) {
      await LoginHistory.create({
        userId: user._id,
        companyId: user.companyId,
        name: user.name,
        email: user.email,
        timestamp: loginAt,
      });
    }

    if (user.role === "staff") {
      const startOfDay = new Date(loginAt);
      startOfDay.setHours(0, 0, 0, 0);
      const alreadyLoggedToday = await Notification.exists({
        companyId: user.companyId,
        entityType: "User",
        entityId: user._id,
        type: "login",
        createdAt: { $gte: startOfDay },
      });

      if (!alreadyLoggedToday) {
        const admins = await User.find({
          companyId: user.companyId,
          role: "admin",
          isActive: true,
        })
          .select("_id")
          .lean();
        const time = loginAt.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });
        for (const admin of admins) {
          await createNotification({
            userId: admin._id,
            companyId: user.companyId,
            type: "login",
            title: "Staff Login",
            message: `${user.name} logged into the system at ${time}.`,
            entityType: "User",
            entityId: user._id,
          });
        }
      }
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
        companyId: user.companyId || null,
        lastLoginAt: user.lastLoginAt || null,
      },
      "Account synced."
    );
  } catch (error) {
    return handleError(error);
  }
}
