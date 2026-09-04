import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", index: true },
    name: { type: String, required: true, trim: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    category: {
      type: String,
      enum: ["GST", "Income Tax", "Bank Statement", "TDS", "ROC", "KYC", "Invoices", "Other"],
      default: "Other",
    },
    cloudinaryUrl: { type: String },
    cloudinaryPublicId: { type: String },
    resourceType: { type: String },
    format: { type: String },
    size: { type: Number },
    storageType: { type: String, enum: ["cloudinary", "local"], default: "cloudinary" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "uploadedAt", updatedAt: true } }
);

documentSchema.index({ clientId: 1, category: 1, name: "text" });
documentSchema.index({ isDeleted: 1, clientId: 1, uploadedAt: -1 });
documentSchema.index({ isDeleted: 1, category: 1, uploadedAt: -1 });

export default mongoose.models.Document || mongoose.model("Document", documentSchema);
