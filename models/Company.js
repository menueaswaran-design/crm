import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastEditedAt: { type: Date },
    editHistory: [
      {
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        editedByName: { type: String },
        field: { type: String },
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        editedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Tenancy is keyed by the Organization _id (companyId), NOT the name.
// Two admins may register companies with the same name — they still get
// fully isolated tenants. Names are NOT unique.
companySchema.index({ companyName: 1 });
companySchema.index({ isActive: 1, createdAt: -1 });

export default mongoose.models.Company || mongoose.model("Company", companySchema);