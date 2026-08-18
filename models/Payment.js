import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, required: true },
    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "BANK", "CHEQUE", "OTHER"],
      default: "BANK",
    },
    referenceNumber: { type: String },
    notes: { type: String },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

paymentSchema.index({ invoiceId: 1, clientId: 1, paymentDate: 1 });

export default mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
