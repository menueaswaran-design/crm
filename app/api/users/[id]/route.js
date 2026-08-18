import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { ok, fail, handleError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const allowed = ["name", "email", "phone", "role", "isActive", "avatarUrl"];
    const update = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const user = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!user) return fail("User not found.", 404);

    return ok(user, "User updated successfully.");
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

    const updated = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!updated) return fail("User not found.", 404);

    return ok(updated, "User deactivated successfully.");
  } catch (error) {
    return handleError(error);
  }
}
