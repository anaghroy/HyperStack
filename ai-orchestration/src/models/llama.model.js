import { ChatGroq } from "@langchain/groq";

/**
 * Llama 3.1 8B Instant (via Groq)
 * URL: https://console.groq.com/playground?model=llama-3.1-8b-instant
 */
export const llamaModel = new ChatGroq({
  modelName: "llama-3.1-8b-instant",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.7,
});
