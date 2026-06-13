import { ChatOpenAI } from "@langchain/openai";

/**
 * Minimax-m2.7
 * URL: https://build.nvidia.com/minimaxai/minimax-m2.7
 */
export const minimaxModel = new ChatOpenAI({
  modelName: "minimaxai/minimax-m2.7",
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: {
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
  temperature: 0.7,
  maxRetries: 0,
  timeout: 10000
});
