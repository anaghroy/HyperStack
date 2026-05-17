import { ChatOpenAI } from "@langchain/openai";

/**
 * Mistral Large 3 (675B)
 * URL: https://build.nvidia.com/mistralai/mistral-large-3-675b-instruct-2512
 */
export const mistralModel = new ChatOpenAI({
  modelName: "mistralai/mistral-large-3-675b-instruct-2512",
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: {
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
  temperature: 0.7,
});
