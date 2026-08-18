/**
 * Invoice financial calculations — single source of truth (server-side).
 */
export function calculateInvoice({ items, gstRate }) {
  const subtotal = (items || []).reduce((s, item) => {
    const qty = Number(item.quantity) || 0;
    const amount = Number(item.amount) || 0;
    return s + qty * amount;
  }, 0);

  const rate = Number(gstRate) || 0;
  const gstAmount = Math.round((subtotal * rate) / 100);
  const totalAmount = subtotal + gstAmount;

  return { subtotal, gstRate: rate, gstAmount, totalAmount };
}

export function deriveInvoiceStatus({ totalAmount, paidAmount, dueDate, status }) {
  const paid = Number(paidAmount) || 0;
  const total = Number(totalAmount) || 0;

  let nextStatus = "PENDING";
  if (paid > 0 && paid < total) nextStatus = "PARTIAL";
  else if (paid >= total) nextStatus = "PAID";

  if (nextStatus !== "PAID" && dueDate && new Date(dueDate) < new Date()) {
    nextStatus = "OVERDUE";
  }
  return nextStatus;
}
