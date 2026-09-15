import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  key: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  sequence: { type: Number, default: 0 },
});

counterSchema.index({ key: 1, companyId: 1 }, { unique: true });

export default mongoose.models.Counter || mongoose.model("Counter", counterSchema);
