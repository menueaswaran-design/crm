import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { createDemoToken } from "@/lib/auth";
import { fail } from "@/lib/api";

/**
 * Demo-mode login. Only active when Firebase is not configured.
 * Creates (or reuses) a local user and returns a signed token.
 */
export async function POST(request) {
  try {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      return fail("Demo login is disabled.", 403);
    }

    const body = await request.json();
    const email = (body.email || "").toLowerCase().trim();
    const name = (body.name || "").trim();
    const requestedRole = body.role || "staff";

    if (!email) return fail("Email is required.", 400);

    await dbConnect();

    let user = await User.findOne({ email });
    if (!user) {
      const role = requestedRole === "admin" ? "admin" : "staff";
      user = await User.create({
        firebaseUid: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name || email.split("@")[0],
        email,
        role,
        isActive: true,
      });
    }
    if (!user.isActive) return fail("This account is inactive.", 403);

    const token = await createDemoToken(user);

    return NextResponse.json({
      success: true,
      data: {
        token: `demo-${token}`,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    return fail("Demo login failed. Please try again.", 500);
  }
}
