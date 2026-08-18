import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["admin", "staff"], default: "staff" },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
    permissions: [{ type: String }],
  },
  { timestamps: true }
);

userSchema.index({ role: 1, isActive: 1 });

export default mongoose.models.User || mongoose.model("User", userSchema);
