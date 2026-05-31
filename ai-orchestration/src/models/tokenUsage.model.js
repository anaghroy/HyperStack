import mongoose from "mongoose";

const tokenUsageSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // We just store the ID string since the user table is in the auth service
  date: { type: String, required: true }, // e.g., 'YYYY-MM-DD'
  tokensUsed: { type: Number, default: 0 },
}, { timestamps: true });

// Compound index for quick lookups by user and date
tokenUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export const TokenUsage = mongoose.model("tokenUsage", tokenUsageSchema);

export const trackTokenUsage = async (userId, tokens) => {
  if (!userId || !tokens || tokens <= 0) return;
  const date = new Date().toISOString().split('T')[0];
  try {
    await TokenUsage.findOneAndUpdate(
      { userId, date },
      { $inc: { tokensUsed: tokens } },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error("Failed to track token usage:", err);
  }
};

