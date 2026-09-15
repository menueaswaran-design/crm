import Counter from "@/models/Counter";

/**
 * Generates the next invoice number in a concurrency-safe way,
 * e.g. INV-2026-001. Scoped per company so tenants never collide.
 */
export async function nextInvoiceNumber(companyId) {
  const year = new Date().getFullYear();
  const key = `invoice-${year}`;
  const counter = await Counter.findOneAndUpdate(
    { key, companyId: companyId || null },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const seq = String(counter.sequence).padStart(3, "0");
  return `INV-${year}-${seq}`;
}

/**
 * Generates the next client code in a concurrency-safe way, e.g. AV-0001.
 * Scoped per company so tenants never share sequences.
 */
export async function nextClientCode(name, companyId) {
  const initials =
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "CL";
  const counter = await Counter.findOneAndUpdate(
    { key: "client", companyId: companyId || null },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const seq = String(counter.sequence).padStart(4, "0");
  return `${initials}-${seq}`;
}

/**
 * Previews the next client-code suffix without consuming the sequence,
 * used to show a live "will be auto-generated" hint in the add form.
 * Scoped per company.
 */
export async function previewNextClientSequence(companyId) {
  const counter = await Counter.findOne({ key: "client", companyId: companyId || null }).lean();
  return String((counter?.sequence || 0) + 1).padStart(4, "0");
}
