import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  try {
    const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);
    const expected = Buffer.from(hex, "hex");
    if (derivedKey.length !== expected.length) return false;
    return timingSafeEqual(derivedKey, expected);
  } catch {
    return false;
  }
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetToken() {
  return randomBytes(32).toString("hex");
}