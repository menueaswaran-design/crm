import * as XLSX from "xlsx";
import dbConnect from "@/lib/mongodb";
import Client from "@/models/Client";
import User from "@/models/User";
import { ok, fail, handleError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const categoryMap = {
  individual: "Individual",
  proprietor: "Proprietor",
  "pvt ltd": "Pvt Ltd",
  "private limited": "Pvt Ltd",
  llp: "LLP",
  partnership: "Partnership",
  huf: "HUF",
  other: "Other",
};

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function valueFromRow(row, aliases) {
  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = normalizeKey(rawKey);
    if (aliases.includes(key)) return String(rawValue || "").trim();
  }
  return "";
}

function normalizeCategory(value) {
  const key = String(value || "").trim().toLowerCase();
  return categoryMap[key] || "Other";
}

function isObjectId(value) {
  return /^[a-f\d]{24}$/i.test(value || "");
}

export async function POST(request) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) return fail("Excel file is required.");

    const filename = String(file.name || "").toLowerCase();
    if (!filename.endsWith(".xlsx") && !filename.endsWith(".xls")) {
      return fail("Please upload a valid Excel file (.xlsx or .xls).", 422);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const workbook = XLSX.read(bytes, { type: "array" });
    const firstSheetName = workbook.SheetNames?.[0];
    if (!firstSheetName) return fail("Excel file is empty.", 422);

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!rows.length) return fail("No rows found in the Excel sheet.", 422);

    const staffUsers = await User.find({ isActive: true, role: "staff" })
      .select("_id name email")
      .lean();

    const staffByEmail = new Map(staffUsers.map((s) => [String(s.email || "").toLowerCase(), s._id]));
    const staffByName = new Map(staffUsers.map((s) => [String(s.name || "").trim().toLowerCase(), s._id]));
    const staffById = new Set(staffUsers.map((s) => String(s._id)));

    const parsed = [];
    const rowErrors = [];

    rows.forEach((row, index) => {
      const rowNo = index + 2;
      const name = valueFromRow(row, ["name", "clientname"]);
      const category = normalizeCategory(valueFromRow(row, ["category", "clientcategory"]));
      const pan = valueFromRow(row, ["pan"]).toUpperCase();
      const aadhaar = valueFromRow(row, ["aadhaar", "aadhar"]);
      const gstin = valueFromRow(row, ["gstin"]).toUpperCase();
      const cin = valueFromRow(row, ["cin"]).toUpperCase();
      const email = valueFromRow(row, ["email"]).toLowerCase();
      const phone = valueFromRow(row, ["phone", "mobileno", "mobile"]);
      const address = valueFromRow(row, ["address"]);
      const status = valueFromRow(row, ["status"]).toLowerCase() === "inactive" ? "inactive" : "active";

      const staffEmail = valueFromRow(row, ["assignedstaffemail", "staffemail"]);
      const staffName = valueFromRow(row, ["assignedstaffname", "staffname", "assignedstaff"]);
      const staffIdRaw = valueFromRow(row, ["assignedstaffid", "staffid"]);

      if (!name || !pan || !email || !phone || !address) {
        rowErrors.push(`Row ${rowNo}: name, pan, email, phone and address are required.`);
        return;
      }

      // Staff is optional — blank means Unassigned.
      let assignedStaff = null;
      const wantsStaff = Boolean(staffEmail || staffName || staffIdRaw);

      if (staffEmail) {
        assignedStaff = staffByEmail.get(staffEmail.toLowerCase()) || null;
      }
      if (!assignedStaff && staffName) {
        assignedStaff = staffByName.get(staffName.toLowerCase()) || null;
      }
      if (!assignedStaff && staffIdRaw && isObjectId(staffIdRaw) && staffById.has(staffIdRaw)) {
        assignedStaff = staffIdRaw;
      }

      if (wantsStaff && !assignedStaff) {
        rowErrors.push(
          `Row ${rowNo}: assigned staff not found ("${staffEmail || staffName || staffIdRaw}"). Left unassigned.`
        );
      }

      parsed.push({
        rowNo,
        data: {
          name,
          category,
          pan,
          aadhaar,
          gstin,
          cin,
          email,
          phone,
          address,
          assignedStaff: assignedStaff || null,
          status,
          createdBy: user._id,
        },
      });
    });

    if (!parsed.length) {
      return fail(`No valid rows to import. ${rowErrors[0] || "Please check your sheet."}`, 422);
    }

    const pans = [...new Set(parsed.map((r) => r.data.pan).filter(Boolean))];
    const gstins = [...new Set(parsed.map((r) => r.data.gstin).filter(Boolean))];

    const existing = await Client.find({
      isDeleted: { $ne: true },
      $or: [{ pan: { $in: pans } }, { gstin: { $in: gstins } }],
    })
      .select("pan gstin")
      .lean();

    const existingPan = new Set(existing.map((c) => String(c.pan || "").toUpperCase()));
    const existingGstin = new Set(existing.map((c) => String(c.gstin || "").toUpperCase()));

    const docsToCreate = [];
    const seenPan = new Set();
    const seenGstin = new Set();

    for (const row of parsed) {
      const pan = row.data.pan;
      const gstin = row.data.gstin;

      if (existingPan.has(pan) || seenPan.has(pan)) {
        rowErrors.push(`Row ${row.rowNo}: duplicate PAN (${pan}) skipped.`);
        continue;
      }
      if (gstin && (existingGstin.has(gstin) || seenGstin.has(gstin))) {
        rowErrors.push(`Row ${row.rowNo}: duplicate GSTIN (${gstin}) skipped.`);
        continue;
      }

      seenPan.add(pan);
      if (gstin) seenGstin.add(gstin);
      docsToCreate.push(row.data);
    }

    if (!docsToCreate.length) {
      return fail("All rows were skipped due to duplicates or invalid data.", 422);
    }

    const created = await Client.insertMany(docsToCreate, { ordered: false });

    await logActivity({
      userId: user._id,
      action: "CLIENT_IMPORT",
      entityType: "Client",
      description: `${user.name} imported ${created.length} clients from Excel`,
    });

    return ok(
      {
        createdCount: created.length,
        skippedCount: rows.length - created.length,
        errors: rowErrors,
      },
      "Clients imported successfully."
    );
  } catch (error) {
    return handleError(error);
  }
}
