import dbConnect from "@/lib/mongodb";
import Company from "@/models/Company";
import { ok, fail, handleError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/auth";

const EDITABLE_FIELDS = ["companyName", "isActive"];

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const superAdmin = await requireSuperAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const company = await Company.findById(id);
    if (!company) return fail("Company not found.", 404);

    const changes = [];
    for (const field of EDITABLE_FIELDS) {
      if (body[field] === undefined) continue;
      const newValue = field === "companyName" ? String(body[field]).trim() : Boolean(body[field]);
      const oldValue = company[field];
      if (String(newValue) === String(oldValue)) continue;
      company[field] = newValue;
      changes.push({
        editedBy: superAdmin._id,
        editedByName: superAdmin.name,
        field,
        oldValue: String(oldValue ?? ""),
        newValue: String(newValue),
        editedAt: new Date(),
      });
    }

    if (!changes.length) return ok(company, "No changes to save.");

    company.lastEditedBy = superAdmin._id;
    company.lastEditedAt = new Date();
    company.editHistory = [...(company.editHistory || []), ...changes];
    if (company.editHistory.length > 200) {
      company.editHistory = company.editHistory.slice(-200);
    }
    await company.save();

    return ok(company, "Company updated successfully.");
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(request, { params }) {
  try {
    await dbConnect();
    await requireSuperAdmin(request);
    const { id } = await params;
    const company = await Company.findById(id)
      .populate("adminUserId", "name email role isActive")
      .lean();
    if (!company) return fail("Company not found.", 404);
    return ok(company);
  } catch (error) {
    return handleError(error);
  }
}