import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, default: "Other", trim: true },
    date: { type: Date, default: Date.now, required: true },
    notes: { type: String, trim: true, default: "" },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ companyId: 1, date: -1 });

export default mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
