import dbConnect from "@/lib/mongodb";
import Client from "@/models/Client";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission, companyScope } from "@/lib/auth";
import { analyzeDocumentWithGemini, isGeminiConfigured } from "@/lib/gemini";
import { escapeRegex } from "@/lib/utils";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const ALLOWED_EXT = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);
const MAX_SIZE = 10 * 1024 * 1024;

function mimeFromName(name) {
  const ext = String(name || "").split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "";
}

async function findMatchingClient(user, analysis) {
  const scope = companyScope(user) || {};
  const base = { isDeleted: { $ne: true }, ...scope };
  if (user.role === "staff") {
    base.assignedStaff = user._id;
  }

  if (analysis.pan) {
    const byPan = await Client.findOne({ ...base, pan: analysis.pan })
      .select("_id name pan gstin phone email clientCode category")
      .lean();
    if (byPan) return { client: byPan, matchReason: "PAN" };
  }

  if (analysis.gstin) {
    const byGstin = await Client.findOne({ ...base, gstin: analysis.gstin })
      .select("_id name pan gstin phone email clientCode category")
      .lean();
    if (byGstin) return { client: byGstin, matchReason: "GSTIN" };
  }

  if (analysis.clientName) {
    const pattern = escapeRegex(analysis.clientName.trim());
    if (pattern.length >= 3) {
      const byName = await Client.findOne({
        ...base,
        name: { $regex: pattern, $options: "i" },
      })
        .select("_id name pan gstin phone email clientCode category")
        .lean();
      if (byName) return { client: byName, matchReason: "name" };
    }
  }

  return { client: null, matchReason: null };
}

export async function GET() {
  return ok({ configured: isGeminiConfigured() });
}

export async function POST(request) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "aiAnalyzer");

    if (!isGeminiConfigured()) {
      return fail(
        "AI Document Analyzer is not configured. Add GEMINI_API_KEY to .env.local.",
        503
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return fail("Please upload a PDF or image file.");
    }

    if (file.size > MAX_SIZE) {
      return fail("File too large. Maximum size is 10 MB.", 422);
    }

    const fileName = file.name || "document.pdf";
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXT.has(ext)) {
      return fail("Unsupported file type. Upload PDF, JPG, or PNG.", 422);
    }

    const mimeType = file.type || mimeFromName(fileName);
    if (!ALLOWED_MIME.has(mimeType)) {
      return fail("Unsupported file type. Upload PDF, JPG, or PNG.", 422);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const analysis = await analyzeDocumentWithGemini({ buffer, mimeType, fileName });
    const { client, matchReason } = await findMatchingClient(user, analysis);

    return ok({
      analysis,
      matchedClient: client,
      matchReason,
      fileName,
    });
  } catch (error) {
    if (error?.message?.includes("GEMINI_API_KEY") || error?.message?.includes("Gemini")) {
      return fail(error.message, 503);
    }
    console.error("AI analyze-document failed:", error);
    return handleError(error);
  }
}
