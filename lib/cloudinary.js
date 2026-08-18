import { v2 as cloudinary } from "cloudinary";

export const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

export function getCloudinary() {
  if (!isCloudinaryConfigured()) return null;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

/**
 * Uploads a file buffer to Cloudinary under client-documents/{clientId}/.
 * Returns metadata compatible with the Document model.
 */
export async function uploadToCloudinary({ buffer, fileName, clientId }) {
  const cloud = getCloudinary();
  if (!cloud) {
    throw new Error("Cloudinary is not configured");
  }
  const safeClientId = String(clientId).replace(/[^a-zA-Z0-9]/g, "");
  const base = fileName.replace(/\.[^.]+$/, "");
  const publicId = `client-documents/${safeClientId}/${Date.now()}-${base}`
    .replace(/\s+/g, "-")
    .toLowerCase();

  const result = await new Promise((resolve, reject) => {
    const stream = cloud.uploader.upload_stream(
      {
        public_id: publicId,
        folder: "ca-office-crm",
        resource_type: "auto",
        tags: ["ca-office-crm", `client-${safeClientId}`],
      },
      (error, uploadResult) => {
        if (error) return reject(error);
        resolve(uploadResult);
      }
    );
    stream.end(buffer);
  });

  return {
    cloudinaryUrl: result.secure_url,
    cloudinaryPublicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format,
    size: result.bytes,
  };
}

export async function deleteFromCloudinary(publicId) {
  const cloud = getCloudinary();
  if (!cloud || !publicId) return;
  await cloud.uploader.destroy(publicId, { resource_type: "image" });
}
