import dbConnect from "@/lib/mongodb";
import Client from "@/models/Client";
import User from "@/models/User";
import { ok, fail, handleError } from "@/lib/api";
import { requireAdmin, companyScope } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

/**
 * Reassigns every active client in the company to a single staff member.
 * Existing assignments are replaced — this is a redistribution, not an append.
 */
export async function POST(request) {
  try {
    await dbConnect();
    const user = await requireAdmin(request);
    const scope = companyScope(user) || {};

    const body = await request.json();
    const staffId = body.staffId;
    if (!staffId) return fail("Please choose a staff member.");

    const staff = await User.findOne({ _id: staffId, isActive: true, role: "staff", ...scope })
      .select("_id name")
      .lean();
    if (!staff) return fail("Staff member not found in your company.", 404);

    const result = await Client.updateMany(
      { isDeleted: { $ne: true }, ...scope },
      { $set: { assignedStaff: [staff._id] } }
    );

    await logActivity({
      userId: user._id,
      companyId: user.companyId,
      action: "CLIENTS_ASSIGNED",
      entityType: "Client",
      description: `${user.name} assigned ${result.modifiedCount} client(s) to ${staff.name}`,
      metadata: { staffId: staff._id, staffName: staff.name, count: result.modifiedCount },
    });

    return ok(
      { count: result.modifiedCount, staff },
      `${result.modifiedCount} client${result.modifiedCount === 1 ? "" : "s"} assigned to ${staff.name}.`
    );
  } catch (error) {
    return handleError(error);
  }
}
