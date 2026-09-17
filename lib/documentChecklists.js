/**
 * Required-document checklists per compliance type.
 * Used when creating filings and for WhatsApp document requests.
 */

const BY_TYPE = {
  "GSTR-1": [
    "Sales / outward supply register",
    "B2B invoices (GST)",
    "Export invoices (if any)",
    "Credit / debit notes",
  ],
  "GSTR-3B": [
    "Purchase / inward supply register",
    "Sales / outward supply register",
    "GST portal login OTP / access",
    "Bank statement (period)",
    "Input tax credit workings",
  ],
  "GSTR-9": [
    "All GSTR-1 & GSTR-3B for the FY",
    "Audited financials (if available)",
    "GST annual workings",
  ],
  "GSTR-9C": [
    "Audited financial statements",
    "GSTR-9 draft",
    "Reconciliation of books vs GST returns",
  ],
  "TDS Return": [
    "TDS challans / payment proofs",
    "Salary / contractor payment register",
    "PAN of deductees",
    "Form 16 / 16A drafts (if any)",
  ],
  ITR: [
    "Form 16 / Form 16A",
    "Bank statements (FY)",
    "Investment proofs (80C / 80D etc.)",
    "Capital gains statements (if any)",
    "Business books / P&L (if applicable)",
  ],
  "Advance Tax": [
    "Estimated income workings",
    "Previous year ITR / computation",
    "Challan payment preference",
  ],
  "ROC Filing": [
    "Audited financial statements",
    "Board resolutions / minutes",
    "Director KYC / DIN details",
    "Shareholding pattern",
  ],
  PF: ["Salary register", "Employee UAN list", "PF challans (if any)"],
  ESI: ["Salary register", "ESI contribution details", "Employee ESI numbers"],
  Other: ["Supporting documents for this filing", "Any notices / correspondence"],
};

const BY_CATEGORY = {
  GST: BY_TYPE["GSTR-3B"],
  "Income Tax": BY_TYPE.ITR,
  TDS: BY_TYPE["TDS Return"],
  ROC: BY_TYPE["ROC Filing"],
  PF: BY_TYPE.PF,
  ESI: BY_TYPE.ESI,
  Other: BY_TYPE.Other,
};

function slugKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

/**
 * Build a fresh checklist array for a compliance type/category.
 * @returns {{ key: string, name: string, received: boolean, receivedAt: null }[]}
 */
export function buildDocumentChecklist({ type, category } = {}) {
  const names = BY_TYPE[type] || BY_CATEGORY[category] || BY_TYPE.Other;
  return names.map((name) => ({
    key: slugKey(name),
    name,
    received: false,
    receivedAt: null,
  }));
}

/** Pending (not yet received) items — for WhatsApp requests. */
export function pendingChecklistDocs(checklist) {
  return (checklist || []).filter((d) => !d.received);
}

export function checklistProgress(checklist) {
  const items = checklist || [];
  const total = items.length;
  const received = items.filter((d) => d.received).length;
  return { total, received, pending: total - received };
}
