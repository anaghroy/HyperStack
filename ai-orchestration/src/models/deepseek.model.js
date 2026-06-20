import { ChatOpenAI } from "@langchain/openai";

/**
 * DeepSeek V4 Pro
 * URL: https://build.nvidia.com/deepseek-ai/deepseek-v4-pro
 */
export const deepseekModel = new ChatOpenAI({
  modelName: "deepseek-ai/deepseek-v4-pro",
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: {
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
  temperature: 0.7,
  maxRetries: 0,
  timeout: 60000,
});
