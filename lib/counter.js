import Counter from "@/models/Counter";

/**
 * Generates the next invoice number in a concurrency-safe way,
 * e.g. INV-2026-001. Uses a counters collection with an atomic increment.
 */
export async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const key = `invoice-${year}`;
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const seq = String(counter.sequence).padStart(3, "0");
  return `INV-${year}-${seq}`;
}

/**
 * Generates the next client code in a concurrency-safe way, e.g. AV-0001.
 * The prefix is derived from the client name (initials) and the suffix is a
 * globally incrementing sequence, so the result is unique while still
 * reflecting the client's data.
 */
export async function nextClientCode(name) {
  const initials =
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "CL";
  const counter = await Counter.findOneAndUpdate(
    { key: "client" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const seq = String(counter.sequence).padStart(4, "0");
  return `${initials}-${seq}`;
}

/**
 * Previews the next client-code suffix without consuming the sequence,
 * used to show a live "will be auto-generated" hint in the add form.
 * Falls back to a placeholder sequence if no counter row exists yet.
 */
export async function previewNextClientSequence() {
  const counter = await Counter.findOne({ key: "client" }).lean();
  return String((counter?.sequence || 0) + 1).padStart(4, "0");
}
