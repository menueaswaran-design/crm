/**
 * WhatsApp message generators for different CRM contexts.
 * All functions return plain text strings — no HTML.
 */

import { FIRM_NAME } from "@/lib/config";
import { formatDate, formatINR } from "@/lib/utils";

/**
 * Generic client greeting message.
 */
export function generateClientMessage({ client }) {
  const name = client?.name || "Client";
  return `Hello ${name},

This is a message from ${FIRM_NAME}.

Please contact us if you need any assistance.

Thank you.`;
}

/**
 * Document request message.
 * Handles singular/plural document lists.
 */
export function generateDocumentRequestMessage({ client, documents, period }) {
  const name = client?.name || "Client";
  const periodLabel = period || "the current period";
  const docList = (documents || []).map((d, i) => `${i + 1}. ${d.name || d}`).join("\n");
  const noun = documents?.length === 1 ? "document" : "documents";
  const verb = documents?.length === 1 ? "" : "s";

  return `Hello ${name},

We are preparing your compliance work for ${periodLabel}.

Please share the following ${noun}${verb}:

${docList}

Kindly share the documents at the earliest.

Thank you,
${FIRM_NAME}`;
}

/**
 * Compliance reminder message for PENDING status.
 */
export function generateComplianceReminderMessage({ client, compliance }) {
  const name = client?.name || "Client";
  const type = compliance?.type || "filing";
  const dueDate = formatDate(compliance?.dueDate);
  const status = compliance?.status || "PENDING";

  return `Hello ${name},

This is a reminder regarding your ${type.toLowerCase()}.

Compliance: ${type}
Due Date: ${dueDate}
Status: ${status}

Please submit the required documents and information at the earliest.

Thank you,
${FIRM_NAME}`;
}

/**
 * Compliance overdue message for OVERDUE status.
 */
export function generateComplianceOverdueMessage({ client, compliance }) {
  const name = client?.name || "Client";
  const type = compliance?.type || "filing";
  const dueDate = formatDate(compliance?.dueDate);

  return `Hello ${name},

Your ${type.toLowerCase()} is currently overdue.

Compliance: ${type}
Due Date: ${dueDate}

Please contact us or submit the required documents as soon as possible.

Thank you,
${FIRM_NAME}`;
}

/**
 * Payment reminder message for unpaid invoices.
 * Uses server-calculated values — does not trust client-side totals.
 */
export function generatePaymentReminderMessage({ client, invoice }) {
  const name = client?.name || "Client";
  const invoiceNumber = invoice?.invoiceNumber || "N/A";
  const totalAmount = formatINR(invoice?.totalAmount || 0);
  const paidAmount = formatINR(invoice?.paidAmount || 0);
  const outstandingAmount = formatINR(invoice?.outstandingAmount || 0);
  const dueDate = formatDate(invoice?.dueDate);

  return `Hello ${name},

This is a reminder regarding your pending payment.

Invoice: ${invoiceNumber}
Invoice Amount: ${totalAmount}
Amount Received: ${paidAmount}
Outstanding Amount: ${outstandingAmount}
Due Date: ${dueDate}

Kindly arrange the pending payment at your earliest convenience.

Thank you,
${FIRM_NAME}`;
}

/**
 * Task reminder message.
 */
export function generateTaskReminderMessage({ client, task }) {
  const name = client?.name || "Client";
  const title = task?.title || "task";
  const dueDate = formatDate(task?.dueDate);
  const priority = task?.priority || "MEDIUM";
  const status = task?.derivedStatus || task?.status || "PENDING";

  return `Hello ${name},

This is a reminder regarding the following work:

Task: ${title}
Due Date: ${dueDate}
Priority: ${priority}
Status: ${status}

Please share the required information/documents at the earliest.

Thank you,
${FIRM_NAME}`;
}
