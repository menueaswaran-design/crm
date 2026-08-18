import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";

import dbConnect from "@/lib/mongodb";
import { getFirebaseAdminAuth } from "@/lib/firebaseAdmin";
import User from "@/models/User";

const DEMO_SECRET = new TextEncoder().encode(
  process.env.DEMO_JWT_SECRET || "crm-demo-secret-change-me"
);

export const DEMO_TOKEN_PREFIX = "demo-";

const firebaseJwks = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

/**
 * Creates a signed demo token (used only when Firebase is not configured).
 */
export async function createDemoToken(user) {
  return new SignJWT({
    uid: user.firebaseUid,
    email: user.email,
    role: user.role,
    demo: true,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(DEMO_SECRET);
}

export async function verifyDemoToken(token) {
  const { payload } = await jwtVerify(token, DEMO_SECRET);
  return payload;
}

/**
 * Verifies a Firebase ID token via Admin SDK, or Google JWKS fallback.
 */
export async function verifyFirebaseIdToken(token) {
  const adminAuth = getFirebaseAdminAuth();
  if (adminAuth) {
    return adminAuth.verifyIdToken(token);
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  const { payload } = await jwtVerify(token, firebaseJwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  return payload;
}

/**
 * Verifies a bearer token and returns the matching MongoDB user.
 * Supports both Firebase ID tokens and demo-mode JWTs.
 * Reads Authorization header first, then crm_token cookie.
 */
export async function getCurrentUser(request) {
  const authHeader = request.headers.get("authorization") || "";
  let token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|;\s*)crm_token=([^;]+)/);
    token = match ? decodeURIComponent(match[1]) : "";
  }

  if (!token) return null;

  await dbConnect();

  let firebaseUid = null;
  let email = null;

  if (token.startsWith(DEMO_TOKEN_PREFIX)) {
    const payload = await verifyDemoToken(token.replace(DEMO_TOKEN_PREFIX, ""));
    firebaseUid = payload.uid;
    email = payload.email ? String(payload.email).toLowerCase() : null;
  } else {
    try {
      const decoded = await verifyFirebaseIdToken(token);
      firebaseUid = decoded?.uid || decoded?.sub || null;
      email = decoded?.email ? String(decoded.email).toLowerCase() : null;
    } catch {
      return null;
    }
  }

  if (!firebaseUid) return null;

  let user = await User.findOne({ firebaseUid }).lean();
  if (!user && email) {
    user = await User.findOne({ email }).lean();
    // Auto-link Firebase UID when CRM user exists by email
    if (user) {
      await User.updateOne({ _id: user._id }, { $set: { firebaseUid } });
      user = { ...user, firebaseUid };
    }
  }

  if (!user || !user.isActive) return null;
  return user;
}

/**
 * Verifies the user and enforces the admin role. Throws on failure.
 */
export async function requireAdmin(request) {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new AuthError(401, "Unauthorized. Please log in again.");
  }
  if (user.role !== "admin") {
    throw new AuthError(403, "You do not have permission to perform this action.");
  }
  return user;
}

/**
 * Verifies the user. Throws on failure.
 */
export async function requireAuth(request) {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new AuthError(401, "Unauthorized. Please log in again.");
  }
  return user;
}

export class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Returns true when Firebase client credentials are absent (demo auth flow).
 */
export function shouldUseDemoAuth() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
