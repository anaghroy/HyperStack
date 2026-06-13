import { ChatCohere } from "@langchain/cohere";

/**
 * Cohere Command R+
 * URL: https://docs.cohere.com/docs/command-r-plus
 */
export const cohereModel = new ChatCohere({
  model: "command-r-plus-08-2024",
  apiKey: process.env.COHERE_API_KEY,
  temperature: 0.7,
  maxRetries: 0,
  timeout: 10000
});
