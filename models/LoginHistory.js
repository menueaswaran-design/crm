import mongoose from "mongoose";

const loginHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, required: true, index: true },
  },
  { timestamps: false }
);

loginHistorySchema.index({ companyId: 1, timestamp: -1 });
loginHistorySchema.index({ companyId: 1, userId: 1, timestamp: -1 });

export default mongoose.models.LoginHistory || mongoose.model("LoginHistory", loginHistorySchema);
