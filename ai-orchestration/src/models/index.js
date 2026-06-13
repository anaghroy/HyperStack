import { qwenModel } from "./qwen.model.js";
import { mistralModel } from "./mistral.model.js";
import { minimaxModel } from "./minimax.model.js";
import { stepModel } from "./step.model.js";
import { deepseekModel } from "./deepseek.model.js";
import { llamaModel } from "./llama.model.js";
import { cohereModel } from "./cohere.model.js";
import { kimiModel } from "./kimi.model.js";
import { SYSTEM_INSTRUCTION } from "./instructions.js";

const models = {
  qwen: qwenModel,
  mistral: mistralModel,
  minimax: minimaxModel,
  step: stepModel,
  deepseek: deepseekModel,
  llama: llamaModel,
  cohere: cohereModel,
  kimi: kimiModel,
};

const fallbackChainNames = ["llama", "mistral", "qwen", "cohere", "deepseek", "minimax", "step", "kimi"];

export const getModelWithFallbacksAndTools = (modelName, tools = []) => {
  const baseModel = models[modelName];
  if (!baseModel) throw new Error(`Model ${modelName} not found`);

  // Bind tools if provided
  let primaryModel = tools.length > 0 ? baseModel.bindTools(tools) : baseModel;

  // Filter out the primary model from the fallback chain
  const fallbacks = fallbackChainNames
    .filter(name => name !== modelName && models[name])
    .map(name => {
      const fallbackModel = models[name];
      return tools.length > 0 ? fallbackModel.bindTools(tools) : fallbackModel;
    });

  if (fallbacks.length > 0) {
    return primaryModel.withFallbacks({ fallbacks });
  }

  return primaryModel;
};



/**
 * Get a model by name.
 * @param {string} name - The name of the model (qwen, mistral, kimi, cohere, ...).
 * @returns {import("@langchain/core/language_models/chat_models").BaseChatModel}
 */
export const getModel = (name) => {
  const model = models[name];

  if (!model) {
    console.warn(`[WARNING] Model "${name}" not found. Falling back to llama. Available models: ${Object.keys(models).join(", ")}`);
    return models["llama"];
  }
  return model;
};

export {
  qwenModel,
  mistralModel,
  minimaxModel,
  stepModel,
  deepseekModel,
  llamaModel,
  cohereModel,
  kimiModel,
  SYSTEM_INSTRUCTION,
};


