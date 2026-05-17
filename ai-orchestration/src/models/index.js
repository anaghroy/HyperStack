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
 * Get a model by name.
 * @param {string} name - The name of the model (qwen, mistral, kimi, cohere, ...).
 * @returns {import("@langchain/core/language_models/chat_models").BaseChatModel}
 */
export const getModel = (name) => {
  const model = models[name];

  if (!model) {
    throw new Error(`Model "${name}" not found. Available models: ${Object.keys(models).join(", ")}`);

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


