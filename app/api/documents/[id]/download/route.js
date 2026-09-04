import dbConnect from "@/lib/mongodb";
import Document from "@/models/Document";
import Client from "@/models/Client";
import { fail } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { getDocumentContent } from "@/lib/documents";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "documents");
    const { id } = await params;

    const doc = await Document.findOne({ _id: id, isDeleted: { $ne: true }, companyId: user.companyId }).lean();
    if (!doc) return fail("Document not found.", 404);

    if (user.role === "staff") {
      const client = await Client.findById(doc.clientId).lean();
      if (client && String(client.assignedStaff) !== String(user._id)) {
        return fail("You do not have access to this document.", 403);
      }
    }

    const file = await getDocumentContent(doc);
    if (!file) return fail("Document file not found.", 404);

    const headers = {
      "Content-Type": file.mime,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.name)}"`,
    };
    return file.kind === "stream"
      ? new Response(file.body, { headers })
      : new Response(new Uint8Array(file.data), { headers });
  } catch (error) {
    return fail("Unable to download document.", 500);
  }
}