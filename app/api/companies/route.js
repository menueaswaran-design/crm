import dbConnect from "@/lib/mongodb";
import Company from "@/models/Company";
import User from "@/models/User";
import { ok, fail, handleError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/auth";
import {
  createOrGetFirebaseUser,
  friendlyFirebaseAuthError,
} from "@/lib/firebaseAuthRest";

export async function GET(request) {
  try {
    await dbConnect();
    await requireSuperAdmin(request);

    const companies = await Company.find({})
      .populate("adminUserId", "name email role isActive")
      .sort({ createdAt: -1 })
      .lean();

    return ok(companies);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const superAdmin = await requireSuperAdmin(request);

    const body = await request.json();

    const companyName = String(body.companyName || "").trim();
    const adminName = String(body.adminName || "").trim();
    const adminEmail = String(body.adminEmail || "").toLowerCase().trim();
    const adminPassword = String(body.adminPassword || "");

    if (!companyName || !adminName || !adminEmail) {
      return fail("Company name, admin name and admin email are required.");
    }
    if (!adminPassword || adminPassword.length < 6) {
      return fail("Admin password is required (min 6 characters).", 400);
    }

    const existingCompany = await Company.findOne({ companyName }).lean();
    if (existingCompany) return fail("A company with this name already exists.", 409);

    const existingUser = await User.findOne({ email: adminEmail }).lean();
    if (existingUser) return fail("A user with this email already exists.", 409);

    let firebaseUid;
    try {
      const result = await createOrGetFirebaseUser(adminEmail, adminPassword);
      firebaseUid = result.uid;
    } catch (err) {
      return fail(friendlyFirebaseAuthError(err.code || err.message), 400);
    }

    const company = await Company.create({
      companyName,
      createdBy: superAdmin._id,
      isActive: true,
    });

    const admin = await User.create({
      firebaseUid,
      name: adminName,
      email: adminEmail,
      role: "admin",
      isActive: true,
      companyId: company._id,
    });

    company.adminUserId = admin._id;
    await company.save();

    return ok(
      {
        company: {
          _id: company._id,
          companyName: company.companyName,
          isActive: company.isActive,
        },
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          companyId: admin.companyId,
        },
      },
      "Company and its admin account created successfully."
    );
  } catch (error) {
    return handleError(error);
  }
}