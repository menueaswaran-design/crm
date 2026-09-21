import * as XLSX from "xlsx";
import { ok, fail, handleError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-\/\.\(\)]+/g, "");
}

const FIELD_ALIASES = {
  name: ["name", "clientname"],
  category: ["category", "clientcategory", "status", "typeofclient", "clienttype", "entitytype"],
  pan: ["pan"],
  aadhaar: ["aadhaar", "aadhar", "adharno", "aadharno", "aadhaarno"],
  gstin: ["gstin", "gstno", "gstnumber"],
  cin: ["cin", "cinno"],
  email: ["email", "emailid", "emailaddress"],
  phone: ["phone", "mobileno", "mobile", "mobilenumber", "contactno", "contactnumber", "mob"],
  address: ["address", "clientaddress", "residentialaddress", "registeredaddress"],
  fatherName: ["fathername", "father", "nameofthefather"],
  passwordOfIntimation: ["passwordofintimationitrv", "passwordofintimation", "itrvpassword", "itrv"],
  assignedStaffEmail: ["assignedstaffemail", "staffemail"],
  assignedStaffName: ["assignedstaffname", "staffname", "assignedstaff"],
  assignedStaffId: ["assignedstaffid", "staffid"],
};

const REQUIRED_FIELDS = ["name", "pan"];
const FIELD_LABELS = {
  name: "Client Name",
  category: "Category",
  pan: "PAN",
  aadhaar: "Aadhaar",
  gstin: "GSTIN",
  cin: "CIN",
  email: "Email",
  phone: "Phone",
  address: "Address",
  fatherName: "Father Name",
  passwordOfIntimation: "Password of Intimation/ITR-V",
  assignedStaffEmail: "Assigned Staff Email",
  assignedStaffName: "Assigned Staff Name",
  assignedStaffId: "Assigned Staff ID",
};

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;

export async function POST(request) {
  try {
    const user = await requirePermission(request, "clients");

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) return fail("Excel file is required.");

    if (file.size > MAX_FILE_SIZE) {
      return fail(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
    }

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

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", range: headerRowIndex });
    if (!rows.length) return fail("No data rows found.", 422);

    const excelHeaders = Object.keys(rows[0] || {});

    const mappings = [];
    const mappedClientFields = new Set();

    for (const excelHeader of excelHeaders) {
      const nk = normalizeKey(excelHeader);
      let matchedField = null;

      for (const [clientField, aliases] of Object.entries(FIELD_ALIASES)) {
        if (aliases.includes(nk)) {
          matchedField = clientField;
          break;
        }
      }

      if (matchedField) {
        mappedClientFields.add(matchedField);
        mappings.push({
          excelHeader: excelHeader.trim(),
          clientField: matchedField,
          label: FIELD_LABELS[matchedField] || matchedField,
          status: "mapped",
        });
      } else {
        mappings.push({
          excelHeader: excelHeader.trim(),
          clientField: null,
          label: null,
          status: "extra",
        });
      }
    }

    const missingRequired = REQUIRED_FIELDS.filter((f) => !mappedClientFields.has(f));

    const allOptional = Object.keys(FIELD_ALIASES).filter((f) => !REQUIRED_FIELDS.includes(f));
    const missingOptional = allOptional.filter((f) => !mappedClientFields.has(f));

    const sampleRows = rows.slice(0, 5).map((row) => {
      const mapped = {};
      for (const m of mappings) {
        if (m.clientField) {
          let val = String(row[m.excelHeader] || "").trim();
          if (m.clientField === "pan") val = val.replace(/\s+/g, "").toUpperCase();
          if (m.clientField === "aadhaar" && val && !AADHAAR_REGEX.test(val.replace(/\s/g, ""))) {
            val = `⚠ Invalid: ${val}`;
          }
          if (m.clientField === "pan" && val && !PAN_REGEX.test(val)) {
            val = `⚠ Invalid: ${val}`;
          }
          mapped[m.clientField] = val;
        }
      }
      const extras = {};
      for (const m of mappings) {
        if (!m.clientField && String(row[m.excelHeader] || "").trim()) {
          extras[m.excelHeader] = String(row[m.excelHeader]).trim();
        }
      }
      return { mapped, extras };
    });

    return ok({
      totalRows: rows.length,
      mappings,
      missingRequired: missingRequired.map((f) => ({
        field: f,
        label: FIELD_LABELS[f] || f,
      })),
      missingOptional: missingOptional.map((f) => ({
        field: f,
        label: FIELD_LABELS[f] || f,
      })),
      sampleRows,
    });
  } catch (error) {
    return handleError(error);
  }
}
