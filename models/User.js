import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["superAdmin", "admin", "staff"], default: "staff" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", index: true },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
    permissions: [{ type: String }],
    dashboardFinancials: { type: Boolean, default: false },
    passwordHash: { type: String },
    resetPasswordTokenHash: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ companyId: 1, role: 1, isActive: 1 });

export default mongoose.models.User || mongoose.model("User", userSchema);
