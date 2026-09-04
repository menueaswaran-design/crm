import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { createDemoToken, DEMO_TOKEN_PREFIX } from "@/lib/auth";
import { fail } from "@/lib/api";

/**
 * Bootstrap admin login using ADMIN_EMAIL / ADMIN_PASSWORD from env.
 * Creates the MongoDB admin user if missing.
 */
export async function POST(request) {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || "";
    const adminName = (process.env.ADMIN_NAME || "Admin").trim();

    if (!adminEmail || !adminPassword) {
      return fail("Admin bootstrap is not configured.", 503);
    }

    const body = await request.json();
    const email = (body.email || "").toLowerCase().trim();
    const password = body.password || "";

    if (!email || !password) {
      return fail("Email and password are required.", 400);
    }

    if (email !== adminEmail || password !== adminPassword) {
      return fail("Invalid email or password.", 401);
    }

    await dbConnect();

    let user = await User.findOne({ email: adminEmail });
    if (!user) {
      user = await User.create({
        firebaseUid: `admin-bootstrap-${adminEmail}`,
        name: adminName,
        email: adminEmail,
        role: "superAdmin",
        isActive: true,
      });
    } else {
      user.role = "superAdmin";
      user.isActive = true;
      if (!user.firebaseUid) {
        user.firebaseUid = `admin-bootstrap-${adminEmail}`;
      }
      if (!user.name) user.name = adminName;
      await user.save();
    }

    const token = await createDemoToken(user);

    return NextResponse.json({
      success: true,
      data: {
        token: `${DEMO_TOKEN_PREFIX}${token}`,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId || null,
        },
      },
    });
  } catch (error) {
    console.error("admin login error:", error);
    return fail("Admin login failed. Please try again.", 500);
  }
}
