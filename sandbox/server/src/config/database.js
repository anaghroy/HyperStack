import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.SANDBOX_MONGO_URI)
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;