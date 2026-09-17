/**
 * Client onboarding packages — auto-create compliance rows for a new client.
 */

function endOfMonthDay(year, monthIndex, day) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, last));
}

/** Next occurrence of day-of-month (1–31), rolling to following month if already passed. */
export function nextDueOnDay(dayOfMonth, from = new Date()) {
  const y = from.getFullYear();
  const m = from.getMonth();
  let candidate = endOfMonthDay(y, m, dayOfMonth);
  candidate.setHours(23, 59, 59, 999);
  if (candidate < from) {
    candidate = endOfMonthDay(y, m + 1, dayOfMonth);
  }
  return candidate;
}

function fyLabel(date = new Date()) {
  const y = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `FY ${y}-${String(y + 1).slice(-2)}`;
}

function periodLabel(date) {
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/**
 * @typedef {{ id: string, label: string, description: string, suitableFor: string[], buildItems: (ctx) => object[] }} PackageDef
 */

/** @type {PackageDef[]} */
export const ONBOARDING_PACKAGES = [
  {
    id: "gst-monthly",
    label: "GST Monthly (GSTR-1 + GSTR-3B)",
    description: "Creates this month’s GSTR-1 & GSTR-3B with monthly auto-rollforward.",
    suitableFor: ["Proprietor", "Pvt Ltd", "LLP", "Partnership", "Other"],
    buildItems({ assignedStaff, createdBy, companyId }) {
      const gstr1Due = nextDueOnDay(11);
      const gstr3bDue = nextDueOnDay(20);
      return [
        {
          type: "GSTR-1",
          category: "GST",
          period: periodLabel(gstr1Due),
          financialYear: fyLabel(gstr1Due),
          dueDate: gstr1Due,
          priority: "HIGH",
          recurrence: "MONTHLY",
          description: "Auto-created from GST Monthly onboarding package.",
          assignedStaff,
          createdBy,
          companyId,
          status: "PENDING",
        },
        {
          type: "GSTR-3B",
          category: "GST",
          period: periodLabel(gstr3bDue),
          financialYear: fyLabel(gstr3bDue),
          dueDate: gstr3bDue,
          priority: "HIGH",
          recurrence: "MONTHLY",
          description: "Auto-created from GST Monthly onboarding package.",
          assignedStaff,
          createdBy,
          companyId,
          status: "PENDING",
        },
      ];
    },
  },
  {
    id: "pvt-ltd-core",
    label: "Pvt Ltd / LLP core",
    description: "GST monthly filings + ROC annual + TDS return starter.",
    suitableFor: ["Pvt Ltd", "LLP"],
    buildItems(ctx) {
      const gst = ONBOARDING_PACKAGES.find((p) => p.id === "gst-monthly").buildItems(ctx);
      const now = new Date();
      const rocDue = new Date(now.getFullYear(), 10, 30); // 30 Nov
      if (rocDue < now) rocDue.setFullYear(rocDue.getFullYear() + 1);
      const tdsDue = nextDueOnDay(31);
      return [
        ...gst,
        {
          type: "ROC Filing",
          category: "ROC",
          period: fyLabel(rocDue),
          financialYear: fyLabel(rocDue),
          dueDate: rocDue,
          priority: "MEDIUM",
          recurrence: "ANNUAL",
          description: "Auto-created from Pvt Ltd / LLP core package.",
          assignedStaff: ctx.assignedStaff,
          createdBy: ctx.createdBy,
          companyId: ctx.companyId,
          status: "PENDING",
        },
        {
          type: "TDS Return",
          category: "TDS",
          period: periodLabel(tdsDue),
          financialYear: fyLabel(tdsDue),
          dueDate: tdsDue,
          priority: "MEDIUM",
          recurrence: "QUARTERLY",
          description: "Auto-created from Pvt Ltd / LLP core package.",
          assignedStaff: ctx.assignedStaff,
          createdBy: ctx.createdBy,
          companyId: ctx.companyId,
          status: "PENDING",
        },
      ];
    },
  },
  {
    id: "income-tax",
    label: "Income Tax (ITR + Advance Tax)",
    description: "ITR due and next advance-tax instalment for individuals / HUF / firms.",
    suitableFor: ["Individual", "HUF", "Proprietor", "Partnership", "Pvt Ltd", "LLP", "Other"],
    buildItems({ assignedStaff, createdBy, companyId }) {
      const now = new Date();
      let itrDue = new Date(now.getFullYear(), 6, 31); // 31 Jul
      if (itrDue < now) itrDue = new Date(now.getFullYear() + 1, 6, 31);
      // Advance tax: 15 Jun, 15 Sep, 15 Dec, 15 Mar
      const advanceDays = [
        [5, 15],
        [8, 15],
        [11, 15],
        [2, 15],
      ];
      let advDue = null;
      for (const [month, day] of advanceDays) {
        const y = month === 2 && now.getMonth() > 2 ? now.getFullYear() + 1 : now.getFullYear();
        const d = new Date(y, month, day);
        if (d >= now) {
          advDue = d;
          break;
        }
      }
      if (!advDue) advDue = new Date(now.getFullYear() + 1, 5, 15);

      return [
        {
          type: "ITR",
          category: "Income Tax",
          period: fyLabel(itrDue),
          financialYear: fyLabel(itrDue),
          dueDate: itrDue,
          priority: "HIGH",
          recurrence: "ANNUAL",
          description: "Auto-created from Income Tax onboarding package.",
          assignedStaff,
          createdBy,
          companyId,
          status: "PENDING",
        },
        {
          type: "Advance Tax",
          category: "Income Tax",
          period: periodLabel(advDue),
          financialYear: fyLabel(advDue),
          dueDate: advDue,
          priority: "MEDIUM",
          recurrence: "QUARTERLY",
          description: "Auto-created from Income Tax onboarding package.",
          assignedStaff,
          createdBy,
          companyId,
          status: "PENDING",
        },
      ];
    },
  },
];

export function listOnboardingPackages(category) {
  if (!category) return ONBOARDING_PACKAGES.map(publicPackage);
  return ONBOARDING_PACKAGES.filter(
    (p) => p.suitableFor.includes(category) || p.suitableFor.includes("Other")
  ).map(publicPackage);
}

function publicPackage(p) {
  return {
    id: p.id,
    label: p.label,
    description: p.description,
    suitableFor: p.suitableFor,
  };
}

export function getOnboardingPackage(id) {
  return ONBOARDING_PACKAGES.find((p) => p.id === id) || null;
}
