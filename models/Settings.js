import mongoose from "mongoose";

const smtpSchema = new mongoose.Schema(
  {
    host: { type: String, trim: true },
    port: { type: Number, default: 587 },
    secure: { type: Boolean, default: false },
    user: { type: String, trim: true },
    pass: { type: String },
    fromName: { type: String, default: "CA Office CRM" },
    fromEmail: { type: String, trim: true, lowercase: true },
    enabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Single shared document — always _id "smtp-settings".
const settingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "smtp-settings" },
    smtp: smtpSchema,
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model("Settings", settingsSchema);