import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const mongoUri = process.env.AI_MONGO_URI;
    if (!mongoUri) {
      console.error("Error: AI_MONGO_URI is not defined in environment variables.");
      return;
    }
    await mongoose.connect(mongoUri);
    console.log("AI Orchestration connected to MongoDB successfully");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  }
};
