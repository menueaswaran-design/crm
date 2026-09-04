import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", index: true },
    invoiceNumber: { type: String, required: true, unique: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    items: [
      {
        description: { type: String, required: true },
        serviceType: { type: String },
        quantity: { type: Number, default: 1 },
        amount: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    outstandingAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["PENDING", "PARTIAL", "PAID", "OVERDUE"],
      default: "PENDING",
    },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

invoiceSchema.index({ clientId: 1, invoiceDate: 1, status: 1, dueDate: 1 });
invoiceSchema.index({ isDeleted: 1, status: 1, invoiceDate: -1 });

export default mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);
