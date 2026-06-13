import { ChatOpenAI } from "@langchain/openai";

/**
 * Step-3.5-Flash
 * URL: https://build.nvidia.com/stepfun-ai/step-3.5-flash
 */
export const stepModel = new ChatOpenAI({
  modelName: "stepfun-ai/step-3.5-flash",
  apiKey: process.env.NVIDIA_API_KEY,
  configuration: {
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
  temperature: 0.7,
  maxRetries: 0,
  timeout: 10000
});
