import mongoose from "mongoose";

const complianceSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    type: { type: String, required: true },
    category: {
      type: String,
      enum: ["GST", "Income Tax", "TDS", "ROC", "PF", "ESI", "Other"],
      default: "GST",
    },
    period: { type: String, trim: true },
    financialYear: { type: String, trim: true },
    dueDate: { type: Date, required: true },
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "OVERDUE", "COMPLETED"],
      default: "PENDING",
    },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "MEDIUM" },
    description: { type: String },
    completedAt: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

complianceSchema.index({ clientId: 1, dueDate: 1, status: 1, assignedStaff: 1, type: 1 });
complianceSchema.index({ status: 1, assignedStaff: 1, dueDate: 1 });

export default mongoose.models.Compliance || mongoose.model("Compliance", complianceSchema);
