import * as XLSX from "xlsx";
import dbConnect from "@/lib/mongodb";
import Client from "@/models/Client";
import Compliance from "@/models/Compliance";
import User from "@/models/User";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { companyScope } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { buildComplianceCalendar } from "@/lib/complianceCalendar";
import { nextClientCode } from "@/lib/counter";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 5000;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+91[\s-]?)?[0]?[6-9]\d{9}$/;

const categoryMap = {
  individual: "Individual",
  proprietor: "Proprietor",
  "pvt ltd": "Pvt Ltd",
  "private limited": "Pvt Ltd",
  "domestic company": "Pvt Ltd",
  "domesticcompany": "Pvt Ltd",
  company: "Pvt Ltd",
  llp: "LLP",
  "limited liability partnership": "LLP",
  partnership: "Partnership",
  "partnership firm": "Partnership",
  huf: "HUF",
  "hindu undivided family": "HUF",
  "sole proprietorship": "Proprietor",
  "sole proprietor": "Proprietor",
  trust: "Other",
  society: "Other",
  other: "Other",
};

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-\/\.\(\)]+/g, "");
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

function formatPhone(value) {
  if (!value) return "";
  const str = String(value).trim();
  const num = Number(str);
  if (!isNaN(num) && str.includes("E")) {
    return String(Math.round(num));
  }
  if (!isNaN(num) && num > 0 && String(Math.round(num)).length >= 10) {
    return String(Math.round(num));
  }
  return str;
}

function sanitizeFieldName(key) {
  return String(key || "")
    .replace(/[\.\$\x00-\x1f]/g, "")
    .trim();
}

export async function POST(request) {
  try {
    await dbConnect();
    const user = await requirePermission(request, "clients");

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) return fail("Excel file is required.");

    if (file.size > MAX_FILE_SIZE) {
      return fail(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
    }

    let extraFieldNamesMap = {};
    try {
      const raw = formData.get("extraFieldNames");
      if (raw) {
        const parsed = JSON.parse(String(raw));
        if (typeof parsed === "object" && parsed !== null) {
          for (const [k, v] of Object.entries(parsed)) {
            const safeKey = sanitizeFieldName(k);
            if (safeKey && typeof v === "string") {
              extraFieldNamesMap[k] = v.replace(/[\.\$\x00-\x1f]/g, "").trim();
            }
          }
        }
      }
    } catch (_) {}

    const filename = String(file.name || "").toLowerCase();
    if (!filename.endsWith(".xlsx") && !filename.endsWith(".xls")) {
      return fail("Please upload a valid Excel file (.xlsx or .xls).", 422);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const workbook = XLSX.read(bytes, { type: "array" });
    const firstSheetName = workbook.SheetNames?.[0];
    if (!firstSheetName) return fail("Excel file is empty.", 422);

    const sheet = workbook.Sheets[firstSheetName];

    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(raw.length, 10); i++) {
      const cells = raw[i].map((c) => normalizeKey(String(c || "")));
      if (cells.some((c) => c === "name" || c === "clientname") && cells.some((c) => c === "pan")) {
        headerRowIndex = i;
        break;
      }
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", skipHidden: true, range: headerRowIndex });
    if (!rows.length) return fail("No rows found in the Excel sheet.", 422);

    if (rows.length > MAX_ROWS) {
      return fail(`File too large. Maximum ${MAX_ROWS} data rows allowed. Found ${rows.length}.`);
    }

    const scope = companyScope(user) || {};
    const staffUsers = await User.find({ isActive: true, role: "staff", ...scope })
      .select("_id name email")
      .lean();

    const staffByEmail = new Map(staffUsers.map((s) => [String(s.email || "").toLowerCase(), s._id]));
    const staffByName = new Map(staffUsers.map((s) => [String(s.name || "").trim().toLowerCase(), s._id]));
    const staffById = new Set(staffUsers.map((s) => String(s._id)));

    const parsed = [];
    const rowErrors = [];
    let skippedValidation = 0;
    let skippedDuplicate = 0;

    const knownKeys = new Set([
      "name", "clientname",
      "category", "clientcategory", "status", "typeofclient", "clienttype", "entitytype",
      "pan",
      "aadhaar", "aadhar", "adharno", "aadharno", "aadhaarno",
      "gstin", "gstno", "gstnumber",
      "cin", "cinno",
      "email", "emailid", "emailaddress",
      "phone", "mobileno", "mobile", "mobilenumber", "contactno", "contactnumber", "mob",
      "address", "clientaddress", "residentialaddress", "registeredaddress",
      "assignedstaffemail", "staffemail",
      "assignedstaffname", "staffname", "assignedstaff",
      "assignedstaffid", "staffid",
      "fathername", "father", "nameofthefather",
    ]);

    rows.forEach((row, index) => {
      const rowNo = index + 2;
      const name = valueFromRow(row, ["name", "clientname"]);
      const category = normalizeCategory(valueFromRow(row, ["category", "clientcategory", "status", "typeofclient", "clienttype", "entitytype"]));
      const pan = valueFromRow(row, ["pan"]).replace(/\s+/g, "").toUpperCase();
      const aadhaar = valueFromRow(row, ["aadhaar", "aadhar", "adharno", "aadharno", "aadhaarno"]);
      const gstin = valueFromRow(row, ["gstin", "gstno", "gstnumber"]);
      const cin = valueFromRow(row, ["cin", "cinno"]);
      const email = valueFromRow(row, ["email", "emailid", "emailaddress"]);
      const phone = formatPhone(valueFromRow(row, ["phone", "mobileno", "mobile", "mobilenumber", "contactno", "contactnumber", "mob"]));
      const address = valueFromRow(row, ["address", "clientaddress", "residentialaddress", "registeredaddress"]);
      const fatherName = valueFromRow(row, ["fathername", "father", "nameofthefather"]);
      const status = "active";

      const staffEmail = valueFromRow(row, ["assignedstaffemail", "staffemail"]);
      const staffName = valueFromRow(row, ["assignedstaffname", "staffname", "assignedstaff"]);
      const staffIdRaw = valueFromRow(row, ["assignedstaffid", "staffid"]);

      const extraFields = {};
      for (const [rawKey, rawValue] of Object.entries(row)) {
        const nk = normalizeKey(rawKey);
        if (!knownKeys.has(nk) && String(rawValue || "").trim()) {
          const customName = extraFieldNamesMap[rawKey.trim()];
          const fieldName = sanitizeFieldName(customName && customName.trim() ? customName : rawKey.trim());
          if (fieldName) {
            extraFields[fieldName] = String(rawValue).trim();
          }
        }
      }

      if (!name && !pan) {
        rowErrors.push(`Row ${rowNo}: skipped — both name and PAN are empty.`);
        skippedValidation++;
        return;
      }
      if (!name) {
        rowErrors.push(`Row ${rowNo}: skipped — name is empty (PAN: ${pan || "—"}).`);
        skippedValidation++;
        return;
      }
      if (!pan) {
        rowErrors.push(`Row ${rowNo}: skipped — PAN is empty (name: ${name}).`);
        skippedValidation++;
        return;
      }
      if (!PAN_REGEX.test(pan)) {
        rowErrors.push(`Row ${rowNo}: skipped — invalid PAN format "${pan}" (name: ${name}). Expected: ABCDE1234F.`);
        skippedValidation++;
        return;
      }
      if (aadhaar && !AADHAAR_REGEX.test(aadhaar.replace(/\s/g, ""))) {
        rowErrors.push(`Row ${rowNo}: skipped — invalid Aadhaar "${aadhaar}" (name: ${name}). Expected 12 digits.`);
        skippedValidation++;
        return;
      }
      if (email && !EMAIL_REGEX.test(email)) {
        rowErrors.push(`Row ${rowNo}: skipped — invalid email "${email}" (name: ${name}).`);
        skippedValidation++;
        return;
      }
      if (phone && !PHONE_REGEX.test(phone)) {
        rowErrors.push(`Row ${rowNo}: skipped — invalid phone "${phone}" (name: ${name}). Expected Indian mobile (10 digits starting 6-9).`);
        skippedValidation++;
        return;
      }

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
          fatherName: fatherName || undefined,
          extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
          assignedStaff: assignedStaff || null,
          status,
          companyId: user.companyId,
          createdBy: user._id,
        },
      });
    });

    if (!parsed.length) {
      return fail(`No valid rows to import. ${rowErrors[0] || "Please check your sheet."}`, 422);
    }

    const pans = [...new Set(parsed.map((r) => r.data.pan).filter(Boolean))];
    const gstins = [...new Set(parsed.map((r) => r.data.gstin).filter(Boolean))];
    const aadhaars = [...new Set(parsed.map((r) => r.data.aadhaar).filter(Boolean))];

    const existing = await Client.find({
      isDeleted: { $ne: true },
      ...scope,
      $or: [{ pan: { $in: pans } }, { gstin: { $in: gstins } }, { aadhaar: { $in: aadhaars } }],
    })
      .select("pan gstin aadhaar")
      .lean();

    const existingPan = new Set(existing.map((c) => String(c.pan || "").toUpperCase()));
    const existingGstin = new Set(existing.map((c) => String(c.gstin || "").toUpperCase()));
    const existingAadhaar = new Set(existing.map((c) => String(c.aadhaar || "").replace(/\s/g, "")));

    const docsToCreate = [];
    const seenPan = new Set();
    const seenGstin = new Set();
    const seenAadhaar = new Set();

    for (const row of parsed) {
      const pan = row.data.pan;
      const gstin = row.data.gstin;
      const aadhaar = row.data.aadhaar ? row.data.aadhaar.replace(/\s/g, "") : "";

      if (existingPan.has(pan) || seenPan.has(pan)) {
        const reason = existingPan.has(pan) ? "already exists in database" : "duplicate in same file";
        rowErrors.push(`Row ${row.rowNo}: skipped — duplicate PAN "${pan}" (${reason}, name: ${row.data.name}).`);
        skippedDuplicate++;
        continue;
      }
      if (gstin && (existingGstin.has(gstin) || seenGstin.has(gstin))) {
        const reason = existingGstin.has(gstin) ? "already exists in database" : "duplicate in same file";
        rowErrors.push(`Row ${row.rowNo}: skipped — duplicate GSTIN "${gstin}" (${reason}, name: ${row.data.name}).`);
        skippedDuplicate++;
        continue;
      }
      if (aadhaar && (existingAadhaar.has(aadhaar) || seenAadhaar.has(aadhaar))) {
        const reason = existingAadhaar.has(aadhaar) ? "already exists in database" : "duplicate in same file";
        rowErrors.push(`Row ${row.rowNo}: skipped — duplicate Aadhaar "${aadhaar}" (${reason}, name: ${row.data.name}).`);
        skippedDuplicate++;
        continue;
      }

      const clientCode = await nextClientCode(row.data.name, user.companyId);
      row.data.clientCode = clientCode;

      seenPan.add(pan);
      if (gstin) seenGstin.add(gstin);
      if (aadhaar) seenAadhaar.add(aadhaar);
      docsToCreate.push(row.data);
    }

    if (!docsToCreate.length) {
      return fail("All rows were skipped due to duplicates or invalid data.", 422);
    }

    let created = [];
    let insertError = null;
    try {
      created = await Client.insertMany(docsToCreate, { ordered: false });
    } catch (err) {
      insertError = err;
      created = err.insertedDocs || [];
      console.error("IMPORT INSERT ERROR:", JSON.stringify({
        name: err.name,
        message: err.message?.slice(0, 300),
        insertedCount: err.insertedCount,
        writeErrorsCount: err.writeErrors?.length || err.result?.writeErrors?.length || 0,
      }, null, 2));
    }

    const complianceDocs = [];
    for (const c of created) {
      complianceDocs.push(...buildComplianceCalendar(c));
    }
    if (complianceDocs.length) {
      try {
        await Compliance.insertMany(complianceDocs, { ordered: false });
      } catch (calErr) {
        if (calErr?.code !== 11000) console.error("IMPORT CALENDAR ERROR:", calErr.message);
      }
    }

    const insertFailedCount = docsToCreate.length - created.length;
    if (insertFailedCount > 0) {
      if (insertError) {
        const we = insertError.writeErrors || insertError.result?.writeErrors || [];
        if (we.length > 0) {
          const errSummary = {};
          for (const e of we) {
            const msg = e.errmsg || e.message || String(e);
            let key;
            if (msg.includes("duplicate key")) {
              const idxMatch = msg.match(/index: (\w+)/);
              key = `duplicate key on ${idxMatch?.[1] || "index"}`;
            } else if (msg.includes("validation")) {
              key = "validation error";
            } else {
              key = "insert error";
            }
            errSummary[key] = (errSummary[key] || 0) + 1;
          }
          for (const [reason, count] of Object.entries(errSummary)) {
            rowErrors.push(`${count} rows failed: ${reason}`);
          }
        } else {
          rowErrors.push(`${insertFailedCount} rows failed: database insert error.`);
        }
      } else {
        rowErrors.push(`${insertFailedCount} rows were not inserted.`);
      }
    }

    const totalSkipped = rows.length - created.length;

    const skipSummary = {
      missingName: 0,
      missingPan: 0,
      bothEmpty: 0,
      invalidFormat: 0,
      duplicatePan: 0,
      duplicateGstin: 0,
      duplicateAadhaar: 0,
      insertFailed: insertFailedCount,
    };
    for (const err of rowErrors) {
      if (err.includes("both name and PAN are empty")) skipSummary.bothEmpty++;
      else if (err.includes("name is empty")) skipSummary.missingName++;
      else if (err.includes("PAN is empty")) skipSummary.missingPan++;
      else if (err.includes("duplicate PAN")) skipSummary.duplicatePan++;
      else if (err.includes("duplicate GSTIN")) skipSummary.duplicateGstin++;
      else if (err.includes("duplicate Aadhaar")) skipSummary.duplicateAadhaar++;
      else if (err.includes("invalid PAN") || err.includes("invalid Aadhaar") || err.includes("invalid email") || err.includes("invalid phone")) skipSummary.invalidFormat++;
    }

    await logActivity({
      userId: user._id,
      companyId: user.companyId,
      action: "CLIENT_IMPORT",
      entityType: "Client",
      description: `${user.name} imported ${created.length} clients from Excel`,
    });

    return ok(
      {
        createdCount: created.length,
        skippedCount: totalSkipped,
        skipSummary,
        errors: rowErrors,
      },
      "Clients imported successfully."
    );
  } catch (error) {
    return handleError(error);
  }
}
