import dbConnect from "@/lib/mongodb";
import Document from "@/models/Document";
import Client from "@/models/Client";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { uploadToCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import { saveLocalFile } from "@/lib/storage";
import { logActivity } from "@/lib/activity";

const ALLOWED_EXTENSIONS = ["pdf", "docx", "xlsx", "xls", "jpg", "jpeg", "png"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function GET(request) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "documents");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);

    const query = { isDeleted: { $ne: true } };
    if (category && category !== "All Categories") query.category = category;
    if (search) query.$or = [{ name: { $regex: search, $options: "i" } }];

    const staffClients = user.role === "staff"
      ? await Client.find({ assignedStaff: user._id }).select("_id").lean()
      : null;
    if (staffClients) {
      query.clientId = { $in: staffClients.map((c) => c._id) };
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
    const file = formData.get("file");

    if (!clientId || !category || !file) {
      return fail("Client, category and file are required.");
    }
    if (!(file instanceof File)) {
      return fail("Invalid file upload.");
    }

    const client = await Client.findOne({ _id: clientId, isDeleted: { $ne: true } }).lean();
    if (!client) return fail("Client not found.", 404);
    if (user.role === "staff" && String(client.assignedStaff) !== String(user._id)) {
      return fail("You can only upload documents for assigned clients.", 403);
    }

    const fileName = file.name || "document";
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return fail("Unsupported file type. Allowed: PDF, DOCX, XLSX, JPG, PNG.");
    }
    if (file.size > MAX_SIZE) {
      return fail("File too large. Maximum size is 10 MB.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let storage;
    if (isCloudinaryConfigured()) {
      storage = {
        storageType: "cloudinary",
        ...(await uploadToCloudinary({ buffer, fileName, clientId })),
      };
    } else {
      const local = await saveLocalFile({ buffer, fileName, clientId });
      storage = {
        storageType: "local",
        cloudinaryUrl: local.url,
        size: local.size,
        resourceType: "raw",
        format: ext,
      };
    }

    const doc = await Document.create({
      name: fileName,
      clientId,
      category,
      ...storage,
      uploadedBy: user._id,
    });

    await logActivity({
      userId: user._id,
      action: "DOCUMENT_UPLOADED",
      entityType: "Document",
      entityId: doc._id,
      description: `${user.name} uploaded ${fileName}`,
    });

    return ok(doc, "Document uploaded successfully.");
  } catch (error) {
    console.error("[documents/POST] error:", error);
    return handleError(error);
  }
}
