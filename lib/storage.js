import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export function getUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

function sanitize(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

/**
 * Stores a file locally (demo mode fallback when Cloudinary is not configured).
 * Returns a path relative to /public so it can be served by Next.js.
 */
export async function saveLocalFile({ buffer, fileName, clientId }) {
  const dir = getUploadDir();
  const safeName = sanitize(fileName);
  const relativePath = path.join(
    "uploads",
    String(clientId).replace(/[^a-zA-Z0-9]/g, ""),
    `${Date.now()}-${safeName}`
  );
  const absolutePath = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, buffer);
  return {
    url: `/uploads/${relativePath.replace(/\\/g, "/")}`,
    relativePath: relativePath.replace(/\\/g, "/"),
    size: buffer.length,
  };
}

export function deleteLocalFile(relativePath) {
  if (!relativePath) return;
  const safe = path.normalize(relativePath);
  if (!safe.startsWith("uploads")) return;
  const absolutePath = path.join(process.cwd(), "public", safe);
  try {
    if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
  } catch {
    // ignore
  }
}

export function resolveLocalFile(relativePath) {
  const safe = path.normalize(relativePath || "");
  if (!safe.startsWith("uploads")) return null;
  const absolutePath = path.join(process.cwd(), "public", safe);
  return fs.existsSync(absolutePath) ? absolutePath : null;
}
