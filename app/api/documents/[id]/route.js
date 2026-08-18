import dbConnect from "@/lib/mongodb";
import Document from "@/models/Document";
import Client from "@/models/Client";
import { ok, fail, handleError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { deleteLocalFile } from "@/lib/storage";
import { logActivity } from "@/lib/activity";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const { id } = await params;

    const doc = await Document.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("clientId", "name")
      .populate("uploadedBy", "name")
      .lean();
    if (!doc) return fail("Document not found.", 404);

    if (user.role === "staff") {
      const client = await Client.findById(doc.clientId?._id || doc.clientId).lean();
      if (client && String(client.assignedStaff) !== String(user._id)) {
        return fail("You do not have access to this document.", 403);
      }
    }

    return ok(doc);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const { id } = await params;

    const doc = await Document.findById(id);
    if (!doc) return fail("Document not found.", 404);

    if (doc.storageType === "cloudinary") {
      await deleteFromCloudinary(doc.cloudinaryPublicId).catch(() => {});
    } else {
      deleteLocalFile(doc.cloudinaryUrl?.replace("/uploads/", "uploads/"));
    }

    doc.isDeleted = true;
    await doc.save();

    await logActivity({
      userId: user._id,
      action: "DOCUMENT_DELETED",
      entityType: "Document",
      entityId: id,
      description: `${user.name} deleted ${doc.name}`,
    });

    return ok(null, "Document deleted successfully.");
  } catch (error) {
    return handleError(error);
  }
}
