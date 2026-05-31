import "dotenv/config";
import { listFiles, readFiles, updateFiles } from "./tools.js";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { getModel } from "../models/index.js";

const tools = [listFiles, readFiles, updateFiles];

const fallbackChain = [
  "llama",
  "cohere",
  "deepseek",
  "qwen",
const invokeAgent = async (params) => {
  const defaultModelName = process.env.AI_MODEL || "llama";
  
  const modelsToTry = defaultModelName === "llama" 
    ? ["llama", "mistral", "qwen"] 
    : [defaultModelName, "llama", "mistral"];

  let lastError;

  for (const name of modelsToTry) {
    try {
      console.log(`[AI Orchestrator] Attempting with model: ${name}`);
      const model = getModel(name);
      const agent = createReactAgent({
        llm: model,
        tools,
      }).withConfig({ recursionLimit: 300 });

      const response = await agent.invoke(params);
      console.log(`[AI Orchestrator] Success with model: ${name}`);
      return response;
    } catch (error) {
      console.error(`[AI Orchestrator] Model ${name} failed:`, error.message);
      lastError = error;
      // Continue to next model in the chain
    }
  }

  throw new Error(`All configured AI models failed. Last error: ${lastError?.message}`);
};

const streamAgent = async function* (inputs, config) {
  const defaultModelName = process.env.AI_MODEL || "llama";
  
  const modelsToTry = defaultModelName === "llama" 
    ? ["llama", "mistral", "qwen"] 
    : [defaultModelName, "llama", "mistral"];

  let lastError;

  for (const name of modelsToTry) {
    try {
      console.log(`[AI Orchestrator] Attempting stream with model: ${name}`);
      const model = getModel(name);
      const agent = createReactAgent({
        llm: model,
        tools,
      }).withConfig({ recursionLimit: 300 });

      // Use streamEvents for real-time token yielding
      const stream = await agent.streamEvents(inputs, { version: "v2", ...config });
      
      let hasYielded = false;
      for await (const chunk of stream) {
        hasYielded = true;
        yield chunk;
      }
      
      // If we yielded chunks, the stream completed successfully.
      if (hasYielded) {
         console.log(`[AI Orchestrator] Stream success with model: ${name}`);
         return; 
      }
    } catch (error) {
      console.error(`[AI Orchestrator] Model ${name} stream failed:`, error.message);
      lastError = error;
      // Continue to next model in the chain
    }
  }

  throw new Error(`All configured AI models failed to stream. Last error: ${lastError?.message}`);
};

export default { 
  invoke: invokeAgent,
  stream: streamAgent,
};

