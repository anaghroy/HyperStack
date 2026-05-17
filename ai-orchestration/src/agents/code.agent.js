import "dotenv/config";
import { listFiles, readFiles, updateFiles } from "./tools.js";
import { createAgent } from "langchain";
import { getModel } from "../models/index.js";

const modelName = process.env.AI_MODEL || "orchestrator"; // Default to orchestrator (failover chain)
const model = getModel(modelName);

const agent = createAgent({
  model,
  tools: [listFiles, readFiles, updateFiles],
}).withConfig({ recursionLimit: 300 });

export default agent;
