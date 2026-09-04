import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { ok, fail, handleError } from "@/lib/api";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { companyScope } from "@/lib/auth";
import { sanitizePermissions, DEFAULT_STAFF_PERMISSIONS } from "@/lib/permissions";
import {
  createOrGetFirebaseUser,
  friendlyFirebaseAuthError,
} from "@/lib/firebaseAuthRest";

export async function GET(request) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const scope = companyScope(user) || {};
    if (user.role === "staff") {
      const staff = await User.find({ isActive: true, role: "staff", ...scope })
        .select("name email role avatarUrl")
        .lean();
      return ok(staff);
    }
    if (user.role === "superAdmin") {
      return ok([]);
    }
    const users = await User.find({ companyId: user.companyId }).select("name email phone role isActive avatarUrl firebaseUid permissions dashboardFinancials companyId").lean();
    return ok(users);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const adminUser = await requireAdmin(request);
    const body = await request.json();

    if (!body.name || !body.email) {
      return fail("Name and email are required.");
    }

    const email = String(body.email).toLowerCase().trim();
    const password = String(body.password || "");
    const role = "staff";

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

    const newUser = await User.create({
      firebaseUid,
      name: body.name.trim(),
      email,
      phone: body.phone || "",
      role,
      isActive: body.isActive !== false,
      companyId: adminUser.companyId,
      permissions: sanitizePermissions(body.permissions) || DEFAULT_STAFF_PERMISSIONS,
      dashboardFinancials: body.dashboardFinancials === true,
    });

    return ok(
      {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        isActive: newUser.isActive,
        permissions: newUser.permissions,
        dashboardFinancials: newUser.dashboardFinancials,
        firebaseUid: newUser.firebaseUid,
        companyId: newUser.companyId,
      },
      "User created successfully. They can sign in with this email and password."
    );
  } catch (error) {
    return handleError(error);
  }
}
