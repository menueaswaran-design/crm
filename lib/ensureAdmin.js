import User from "@/models/User";
import { createOrGetFirebaseUser } from "@/lib/firebaseAuthRest";

function getAdminConfig() {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = (process.env.ADMIN_NAME || "Admin").trim();
  return { email, password, name };
}

let ensurePromise = null;

/**
 * Ensures the bootstrap admin from env exists in Firebase Auth + MongoDB.
 * Safe to call repeatedly; runs once per process.
 */
export async function ensureAdminUser() {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const { email, password, name } = getAdminConfig();
    if (!email || !password) {
      console.warn("[ensureAdmin] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping.");
      return null;
    }

    const { uid: firebaseUid } = await createOrGetFirebaseUser(email, password);

    let user = await User.findOne({ email });
    if (user) {
      user.firebaseUid = firebaseUid;
      user.role = "admin";
      user.isActive = true;
      if (!user.name) user.name = name;
      await user.save();
    } else {
      user = await User.create({
        firebaseUid,
        name,
        email,
        role: "admin",
        isActive: true,
      });
    }

    console.log(`[ensureAdmin] Admin ready: ${email}`);
    return user;
  })().catch((err) => {
    ensurePromise = null;
    console.error("[ensureAdmin] Failed:", err.message);
    return null;
  });

  return ensurePromise;
}
