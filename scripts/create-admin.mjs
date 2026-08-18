/**
 * One-shot script: create/update bootstrap admin from env.
 * Usage: node --env-file=.env.local scripts/create-admin.mjs
 */
import { createRequire } from "module";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Register Next-style @/ alias via dynamic import of compiled paths.
// Load dotenv first if --env-file unsupported.
try {
  require("dotenv").config({ path: path.join(root, ".env.local") });
} catch {
  // ignore
}

async function main() {
  // Use relative imports since this runs outside Next bundler.
  const mongoose = (await import("mongoose")).default;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI missing in .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const IDENTITY_TOOLKIT = "https://identitytoolkit.googleapis.com/v1/accounts";
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = (process.env.ADMIN_NAME || "Admin").trim();
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";

  if (!email || !password) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
    process.exit(1);
  }
  if (!apiKey) {
    console.error("NEXT_PUBLIC_FIREBASE_API_KEY is required.");
    process.exit(1);
  }

  async function authRequest(pathName, body) {
    const res = await fetch(`${IDENTITY_TOOLKIT}:${pathName}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      const err = new Error(json?.error?.message || "Firebase Auth failed");
      err.code = json?.error?.message;
      throw err;
    }
    return json;
  }

  let firebaseUid;
  try {
    const created = await authRequest("signUp", {
      email,
      password,
      returnSecureToken: true,
    });
    firebaseUid = created.localId;
    console.log("Created Firebase Auth user.");
  } catch (err) {
    if (err.code !== "EMAIL_EXISTS") throw err;
    const existing = await authRequest("signInWithPassword", {
      email,
      password,
      returnSecureToken: true,
    });
    firebaseUid = existing.localId;
    console.log("Firebase Auth user already exists — signed in OK.");
  }

  const UserSchema = new mongoose.Schema(
    {
      firebaseUid: String,
      name: String,
      email: { type: String, unique: true },
      phone: String,
      role: { type: String, enum: ["admin", "staff"], default: "staff" },
      avatarUrl: String,
      isActive: { type: Boolean, default: true },
      permissions: [String],
    },
    { timestamps: true }
  );
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  let user = await User.findOne({ email });
  if (user) {
    user.firebaseUid = firebaseUid;
    user.role = "admin";
    user.isActive = true;
    user.name = name;
    await user.save();
    console.log("Updated MongoDB admin user.");
  } else {
    user = await User.create({
      firebaseUid,
      name,
      email,
      role: "admin",
      isActive: true,
    });
    console.log("Created MongoDB admin user.");
  }

  console.log("\nAdmin ready:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  UID:      ${firebaseUid}`);
  console.log(`  Role:     admin`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
