import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  provider: { type: String, enum: ["Google", "GitHub", "System"], required: true },
  status: { type: String, enum: ["Success", "Failed"], required: true },
  message: { type: String }
}, { timestamps: true });

const AuditLog = mongoose.model("auditLog", auditLogSchema);

export default AuditLog;
