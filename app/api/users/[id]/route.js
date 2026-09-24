import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { ok, fail, handleError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { sanitizePermissions } from "@/lib/permissions";

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const user = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const allowed = ["name", "email", "phone", "isActive", "avatarUrl", "dashboardFinancials", "permissions"];
    const update = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    const permissions = sanitizePermissions(body.permissions);
    if (permissions !== null) update.permissions = permissions;

    const updated = await User.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      update,
      { returnDocument: "after", runValidators: true }
    );
    if (!updated) return fail("User not found.", 404);

    return ok(updated, "User updated successfully.");
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const user = await requireAdmin(request);
    const { id } = await params;

    if (id === String(user._id)) {
      return fail("You cannot delete your own account.", 400);
    }

    const target = await User.findOne({ _id: id, companyId: user.companyId });
    if (!target) return fail("User not found.", 404);

    await User.deleteOne({ _id: id });
    return ok(null, "User deleted successfully.");
  } catch (error) {
    return handleError(error);
  }
}
