import dbConnect from "@/lib/mongodb";
import Document from "@/models/Document";
import Client from "@/models/Client";
import { fail } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { resolveLocalFile } from "@/lib/storage";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "documents");
    const { id } = await params;

    const doc = await Document.findOne({ _id: id, isDeleted: { $ne: true } }).lean();
    if (!doc) return fail("Document not found.", 404);

    if (user.role === "staff") {
      const client = await Client.findById(doc.clientId).lean();
      if (client && String(client.assignedStaff) !== String(user._id)) {
        return fail("You do not have access to this document.", 403);
      }
    }

    if (doc.storageType === "cloudinary") {
      return Response.redirect(doc.cloudinaryUrl, 302);
    }

    const filePath = resolveLocalFile(doc.cloudinaryUrl?.replace("/uploads/", "uploads/"));
    if (!filePath) return fail("Document file not found.", 404);

    const fs = await import("fs");
    const data = fs.readFileSync(filePath);
    const mime = doc.format === "pdf" ? "application/pdf"
      : doc.format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : doc.format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : /jpg|jpeg/.test(doc.format || "") ? "image/jpeg"
      : doc.format === "png" ? "image/png"
      : "application/octet-stream";

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.name)}"`,
      },
    });
  } catch (error) {
    return fail("Unable to download document.", 500);
  }
}
