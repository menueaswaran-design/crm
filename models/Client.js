import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", index: true },
    clientCode: { type: String, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Individual", "Proprietor", "Pvt Ltd", "LLP", "Partnership", "HUF", "Other"],
      default: "Other",
    },
    pan: { type: String, uppercase: true, trim: true },
    aadhaar: { type: String, trim: true },
    gstin: { type: String, uppercase: true, trim: true },
    cin: { type: String, uppercase: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

clientSchema.index({ name: "text", email: "text", gstin: "text" });
clientSchema.index({ clientCode: 1 }, { unique: true, sparse: true });
clientSchema.index({ isDeleted: 1, category: 1, createdAt: -1 });
clientSchema.index({ isDeleted: 1, assignedStaff: 1, createdAt: -1 });
clientSchema.index({ pan: 1, isDeleted: 1 });
clientSchema.index({ gstin: 1, isDeleted: 1 });

export default mongoose.models.Client || mongoose.model("Client", clientSchema);
