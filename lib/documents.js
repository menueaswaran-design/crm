import fs from "fs";
import { resolveLocalFile } from "@/lib/storage";

export function mimeTypeFor(format) {
  const f = String(format || "").toLowerCase();
  if (f === "pdf") return "application/pdf";
  if (f === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (f === "xls") return "application/vnd.ms-excel";
  if (f === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (f === "doc") return "application/msword";
  if (/jpg|jpeg/.test(f)) return "image/jpeg";
  if (f === "png") return "image/png";
  return "application/octet-stream";
}

/**
 * Reads a locally-stored document file. Returns null when the file is missing.
 * doc.cloudinaryUrl holds the /uploads/ path when storageType is "local".
 */
export function readLocalDocumentFile(doc) {
  const filePath = resolveLocalFile(doc.cloudinaryUrl?.replace("/uploads/", "uploads/"));
  if (!filePath) return null;
  const data = fs.readFileSync(filePath);
  return { data, mime: mimeTypeFor(doc.format) };
}

/**
 * Resolves the raw document bytes so the file is always served from
 * this app's own API (never a redirect to Cloudinary).
 * - cloudinary docs are proxied through the server
 * - local docs are read from disk
 * Returns null when the file cannot be resolved.
 */
export async function getDocumentContent(doc) {
  if (doc.storageType === "cloudinary") {
    const res = await fetch(doc.cloudinaryUrl, { cache: "no-store" });
    if (!res.ok) return null;
    return {
      kind: "stream",
      body: res.body,
      mime: mimeTypeFor(doc.format),
    };
  }
  const file = readLocalDocumentFile(doc);
  if (!file) return null;
  return { kind: "buffer", data: file.data, mime: file.mime };
}