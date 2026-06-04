import mongoose from "mongoose";

const memorySchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  context: {
    type: String,
    required: true,
  },
}, { timestamps: true });

export const ProjectMemory = mongoose.model("ProjectMemory", memorySchema);
