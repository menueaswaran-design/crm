import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2, "Client name must be at least 2 characters."),
  category: z.string().min(1, "Category is required."),
  pan: z.string().regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/, "Invalid PAN format."),
  aadhaar: z
    .string()
    .regex(/^[0-9]{12}$/, "Aadhaar must be 12 digits.")
    .optional()
    .or(z.literal("")),
  gstin: z
    .string()
    .regex(
      /^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}[1-9A-Za-z]{1}Z[0-9A-Za-z]{1}$/,
      "Invalid GSTIN format."
    )
    .optional()
    .or(z.literal("")),
  cin: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email address."),
  phone: z.string().regex(/^(\+91[\s-]?)?[0]?[6-9]\d{9}$/, "Invalid Indian phone number."),
  address: z.string().min(1, "Address is required."),
  assignedStaff: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).optional(),
});

export const complianceSchema = z.object({
  clientId: z.string().min(1, "Client is required."),
  type: z.string().min(1, "Compliance type is required."),
  category: z.string().min(1, "Category is required."),
  period: z.string().min(1, "Period is required."),
  financialYear: z.string().min(1, "Financial year is required."),
  dueDate: z.string().min(1, "Due date is required."),
  assignedStaff: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

export const taskSchema = z.object({
  title: z.string().min(2, "Task title must be at least 2 characters."),
  description: z.string().min(1, "Description is required."),
  clientId: z.string().min(1, "Client is required."),
  assignedTo: z.string().optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  dueDate: z.string().min(1, "Due date is required."),
});

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Item description is required."),
  serviceType: z.string().min(1, "Service type is required."),
  quantity: z.number().min(1, "Quantity must be at least 1."),
  amount: z.number().min(0, "Amount cannot be negative."),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required."),
  invoiceDate: z.string().min(1, "Invoice date is required."),
  dueDate: z.string().min(1, "Due date is required."),
  gstRate: z.number().min(0).max(100).default(0),
  items: z.array(invoiceItemSchema).min(1, "Add at least one invoice item."),
  notes: z.string().optional().or(z.literal("")),
});

export const paymentSchema = z.object({
  amount: z.number().min(1, "Payment amount must be positive."),
  paymentDate: z.string().min(1, "Payment date is required."),
  paymentMethod: z.enum(["CASH", "UPI", "BANK", "CHEQUE", "OTHER"]),
  referenceNumber: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});
