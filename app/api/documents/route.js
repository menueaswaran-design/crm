import dbConnect from "@/lib/mongodb";
import Document from "@/models/Document";
import Client from "@/models/Client";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { companyScope } from "@/lib/auth";
import { uploadToCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import { saveLocalFile } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
import { isAssignedToUser } from "@/lib/clientAssignment";

const ALLOWED_EXTENSIONS = ["pdf", "docx", "xlsx", "xls", "jpg", "jpeg", "png"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES = 20; // files per batch
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50 MB per batch

/**
 * Persists one uploaded file to Cloudinary (or the local fallback)
 * and returns metadata compatible with the Document model.
 */
async function storeFile({ file, clientId }) {
  const fileName = file.name || "document";
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isCloudinaryConfigured()) {
    return {
      storageType: "cloudinary",
      ...(await uploadToCloudinary({ buffer, fileName, clientId })),
    };
  }

  const local = await saveLocalFile({ buffer, fileName, clientId });
  return {
    storageType: "local",
    cloudinaryUrl: local.url,
    size: local.size,
    resourceType: "raw",
    format: ext,
  };
}

export async function GET(request) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "documents");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const clientId = searchParams.get("clientId") || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);

    const scope = companyScope(user) || {};
    const query = { isDeleted: { $ne: true }, ...scope };
    if (category && category !== "All Categories") query.category = category;
    if (search) query.$or = [{ name: { $regex: search, $options: "i" } }];

    const staffClientIds = user.role === "staff"
      ? (await Client.find({ assignedStaff: user._id, ...scope }).select("_id").lean()).map((c) => c._id)
      : null;

    if (clientId) {
      const reachable = staffClientIds
        ? staffClientIds.some((id) => String(id) === clientId)
        : await Client.exists({ _id: clientId, isDeleted: { $ne: true }, ...scope });
      if (!reachable) return fail("Client not found.", 404);
      query.clientId = clientId;
    }

    if (staffClientIds) {
      // Ownership is already verified above, so narrowing to the requested
      // client stays within the staff member's own set of clients.
      query.clientId = query.clientId ? { $in: [query.clientId] } : { $in: staffClientIds };
    }

    const [docs, total] = await Promise.all([
      Document.find(query)
        .populate("clientId", "name")
        .populate("uploadedBy", "name")
        .sort({ uploadedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Document.countDocuments(query),
    ]);

    return ok(docs, "", {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "documents");

    const formData = await request.formData();
    const clientId = formData.get("clientId");
    const category = formData.get("category");
    const files = formData
      .getAll("file")
      .filter((f) => f instanceof File && f.size > 0);

    if (!clientId || !category || !files.length) {
      return fail("Client, category and file are required.");
    }
    if (files.length > MAX_FILES) {
      return fail(`You can upload up to ${MAX_FILES} files at a time.`);
    }

    const scope = companyScope(user) || {};
    const client = await Client.findOne({ _id: clientId, isDeleted: { $ne: true }, ...scope }).lean();
    if (!client) return fail("Client not found.", 404);
    if (user.role === "staff" && !isAssignedToUser(client, user)) {
      return fail("You can only upload documents for assigned clients.", 403);
    }

    // Validate the whole batch before storing anything so a single bad file
    // cannot leave a half-finished upload behind.
    const rejected = [];
    let totalSize = 0;
    for (const file of files) {
      const name = file.name || "document";
      const ext = (name.split(".").pop() || "").toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        rejected.push(`${name} (unsupported type)`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        rejected.push(`${name} (over ${MAX_SIZE / 1024 / 1024} MB)`);
        continue;
      }
      totalSize += file.size;
    }
    if (rejected.length) {
      const shown = rejected.slice(0, 3).join(", ");
      const more = rejected.length > 3 ? ` and ${rejected.length - 3} more` : "";
      return fail(
        `Remove ${rejected.length} invalid file(s): ${shown}${more}. ` +
          `Allowed: PDF, DOCX, XLSX, JPG, PNG, max ${MAX_SIZE / 1024 / 1024} MB each.`
      );
    }
    if (totalSize > MAX_TOTAL_SIZE) {
      return fail(
        `Combined size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024} MB. Please upload fewer files at a time.`
      );
    }

    const uploaded = [];
    const failed = [];

    for (const file of files) {
      const fileName = file.name || "document";
      try {
        const storage = await storeFile({ file, clientId });
        const doc = await Document.create({
          name: fileName,
          clientId,
          companyId: user.companyId,
          category,
          ...storage,
          uploadedBy: user._id,
        });
        uploaded.push(doc);

        await logActivity({
          userId: user._id,
          companyId: user.companyId,
          action: "DOCUMENT_UPLOADED",
          entityType: "Document",
          entityId: doc._id,
          description: `${user.name} uploaded ${fileName}`,
        });
      } catch (err) {
        console.error(`[documents/POST] failed to store "${fileName}":`, err);
        failed.push({ name: fileName, error: err.message });
      }
    }

    if (!uploaded.length) {
      return fail(failed[0]?.error || "Upload failed. Please try again.", 500);
    }

    const message =
      uploaded.length === 1
        ? "Document uploaded successfully."
        : `${uploaded.length} documents uploaded successfully.`;
    return ok(uploaded, failed.length ? `${message} ${failed.length} failed.` : message, { failed });
  } catch (error) {
    console.error("[documents/POST] error:", error);
    return handleError(error);
  }
}
