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
