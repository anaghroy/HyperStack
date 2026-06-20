import { ChatOpenAI } from "@langchain/openai";

/**
 * Moonshot AI Kimi-k2.6
 * A 1T multimodal MoE model optimized for long-horizon coding and agentic orchestration.
 * URL: https://build.nvidia.com/moonshotai/kimi-k2.6
 */
export const kimiModel = new ChatOpenAI({
  model: "moonshotai/kimi-k2.6",
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: {
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
  temperature: 0.7,
  maxRetries: 0,
  timeout: 120000
});
