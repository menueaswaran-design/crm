import dbConnect from "@/lib/mongodb";
import Compliance from "@/models/Compliance";
import { ok, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { companyScope } from "@/lib/auth";
import { refreshOverdueCompliance } from "@/lib/status";

const UNASSIGNED_QUERY = {
  $or: [{ assignedStaff: null }, { assignedStaff: { $exists: false } }],
};

const TAB_STATUSES = [
  { label: "All", status: "" },
  { label: "Pending", status: "PENDING" },
  { label: "In Progress", status: "IN_PROGRESS" },
  { label: "Overdue", status: "OVERDUE" },
  { label: "Completed", status: "COMPLETED" },
];

export async function GET(request) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "compliance");

    const { searchParams } = new URL(request.url);
    const assigned = searchParams.get("assigned") || "";

    await refreshOverdueCompliance();

    const scope = companyScope(user) || {};
    const baseQuery = { ...scope };
    if (user.role === "staff") {
      baseQuery.assignedStaff = user._id;
    } else if (assigned === "unassigned") {
      Object.assign(baseQuery, UNASSIGNED_QUERY);
    } else if (assigned === "assigned") {
      baseQuery.assignedStaff = { $ne: null, $exists: true };
    }

    const entries = await Promise.all(
      TAB_STATUSES.map(async ({ label, status }) => {
        const query = { ...baseQuery };
        if (status) query.status = status;
        const total = await Compliance.countDocuments(query);
        return [label, total];
      })
    );

    return ok(Object.fromEntries(entries));
  } catch (error) {
    return handleError(error);
  }
}
