import { ChatOpenAI } from "@langchain/openai";

/**
 * Qwen 3 Coder 480B
 * URL: https://build.nvidia.com/qwen/qwen3-coder-480b-a35b-instruct
 */
export const qwenModel = new ChatOpenAI({
  modelName: "qwen/qwen3-coder-480b-a35b-instruct",
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: {
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
  temperature: 0.7,
});
