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



/**
 * Comprehensive Fallback chain for absolute reliability.
 * Priority: Qwen -> Mistral -> Kimi -> Cohere -> DeepSeek -> Minimax -> Step -> Llama
 */
export const orchestratorModel = qwenModel.withFallbacks({
  fallbacks: [
    mistralModel,
    kimiModel,
    cohereModel,
    deepseekModel,
    minimaxModel,
    stepModel,
    llamaModel,
  ],
});



/**
 * Get a model by name.
 * @param {string} name - The name of the model or 'orchestrator' for the fallback chain (qwen, mistral, kimi, cohere, ...).

 * @returns {import("@langchain/core/language_models/chat_models").BaseChatModel}
 */
export const getModel = (name) => {
  if (name === "orchestrator") return orchestratorModel;
  
  const model = models[name];
  if (!model) {
    throw new Error(`Model "${name}" not found. Available models: ${Object.keys(models).join(", ")}, orchestrator`);
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
  orchestratorModel,
  SYSTEM_INSTRUCTION,
};


