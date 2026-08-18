import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    entityType: { type: String },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    description: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

activitySchema.index({ entityId: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });

export default mongoose.models.Activity || mongoose.model("Activity", activitySchema);
