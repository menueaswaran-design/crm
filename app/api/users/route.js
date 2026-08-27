import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { ok, fail, handleError } from "@/lib/api";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { sanitizePermissions, DEFAULT_STAFF_PERMISSIONS } from "@/lib/permissions";
import {
  createOrGetFirebaseUser,
  friendlyFirebaseAuthError,
} from "@/lib/firebaseAuthRest";

export async function GET(request) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    if (user.role === "staff") {
      const staff = await User.find({ isActive: true, role: "staff" })
        .select("name email role avatarUrl")
        .lean();
      return ok(staff);
    }
    const users = await User.find({}).select("name email phone role isActive avatarUrl firebaseUid permissions dashboardFinancials").lean();
    return ok(users);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    await requireAdmin(request);
    const body = await request.json();

    if (!body.name || !body.email) {
      return fail("Name and email are required.");
    }

    const email = String(body.email).toLowerCase().trim();
    const password = String(body.password || "");
    const role = body.role === "admin" ? "admin" : "staff";

    if (!password || password.length < 6) {
      return fail("Password is required (min 6 characters) so the user can sign in.", 400);
    }

    const exists = await User.findOne({ email }).lean();
    if (exists) return fail("A user with this email already exists.", 409);

    let firebaseUid;
    try {
      const result = await createOrGetFirebaseUser(email, password);
      firebaseUid = result.uid;
    } catch (err) {
      return fail(friendlyFirebaseAuthError(err.code || err.message), 400);
    }

    const user = await User.create({
      firebaseUid,
      name: body.name.trim(),
      email,
      phone: body.phone || "",
      role,
      isActive: body.isActive !== false,
      permissions: sanitizePermissions(body.permissions) || DEFAULT_STAFF_PERMISSIONS,
      dashboardFinancials: body.dashboardFinancials === true,
    });

    return ok(
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        permissions: user.permissions,
        dashboardFinancials: user.dashboardFinancials,
        firebaseUid: user.firebaseUid,
      },
      "User created successfully. They can sign in with this email and password."
    );
  } catch (error) {
    return handleError(error);
  }
}
