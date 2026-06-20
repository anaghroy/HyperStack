import { ChatGroq } from "@langchain/groq";

/**
 * Llama 3.3 70B Versatile (via Groq)
 * URL: https://console.groq.com/playground?model=llama-3.3-70b-versatile
 */
export const llamaModel = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.7,
  maxRetries: 1,
  timeout: 45000,
  maxTokens: 8192,
});
