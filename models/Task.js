import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "MEDIUM" },
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED"],
      default: "PENDING",
    },
    dueDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    startedAt: { type: Date },
    completedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

taskSchema.index({ clientId: 1, assignedTo: 1, status: 1, priority: 1, dueDate: 1 });
taskSchema.index({ isDeleted: 1, assignedTo: 1, dueDate: 1, priority: -1 });

export default mongoose.models.Task || mongoose.model("Task", taskSchema);
