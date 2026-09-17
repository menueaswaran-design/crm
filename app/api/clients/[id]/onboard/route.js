import dbConnect from "@/lib/mongodb";
import Client from "@/models/Client";
import Compliance from "@/models/Compliance";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission, companyScope } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { endOfDay } from "@/lib/status";
import { getOnboardingPackage, listOnboardingPackages } from "@/lib/complianceTemplates";
import { buildDocumentChecklist } from "@/lib/documentChecklists";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "clients");
    const { id } = await params;
    const scope = companyScope(user) || {};

    const client = await Client.findOne({ _id: id, isDeleted: { $ne: true }, ...scope })
      .select("category name")
      .lean();
    if (!client) return fail("Client not found.", 404);

    return ok({
      packages: listOnboardingPackages(client.category),
      clientCategory: client.category,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "compliance");
    const { id } = await params;
    const body = await request.json();
    const packageId = body.packageId;

    if (!packageId) return fail("packageId is required.");

    const pkg = getOnboardingPackage(packageId);
    if (!pkg) return fail("Unknown onboarding package.", 404);

    const scope = companyScope(user) || {};
    const client = await Client.findOne({ _id: id, isDeleted: { $ne: true }, ...scope }).lean();
    if (!client) return fail("Client not found.", 404);
    if (user.role === "staff" && String(client.assignedStaff) !== String(user._id)) {
      return fail("You can only onboard assigned clients.", 403);
    }

    const items = pkg.buildItems({
      assignedStaff: client.assignedStaff || null,
      createdBy: user._id,
      companyId: user.companyId,
      clientId: client._id,
    });

    const docs = items.map((item) => {
      const dueDate = new Date(item.dueDate);
      return {
        ...item,
        clientId: client._id,
        companyId: user.companyId,
        dueDate,
        status: endOfDay(dueDate) < new Date() ? "OVERDUE" : "PENDING",
        documentChecklist: buildDocumentChecklist({
          type: item.type,
          category: item.category,
        }),
      };
    });

    const created = await Compliance.insertMany(docs);

    await logActivity({
      userId: user._id,
      action: "ONBOARDING_PACKAGE_APPLIED",
      entityType: "Client",
      entityId: client._id,
      description: `${user.name} applied "${pkg.label}" to ${client.name} (${created.length} filings)`,
      metadata: { packageId, count: created.length },
    });

    return ok(
      { created: created.length, packageId, packageLabel: pkg.label },
      `Created ${created.length} compliance records.`
    );
  } catch (error) {
    return handleError(error);
  }
}
