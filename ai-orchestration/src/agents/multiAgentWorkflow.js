import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { getModelWithFallbacksAndTools } from "../models/index.js";
import { searchCodebase } from "../services/vectorStore.js";
import { listFiles, readFiles, updateFiles, finishTask } from "./tools.js";

const getSafeModelWithTools = (modelName, tools = []) => {
  try {
    return getModelWithFallbacksAndTools(modelName, tools);
  } catch (err) {
    return getModelWithFallbacksAndTools("llama", tools);
  }
};

// Define the state for the graph
const agentState = {
  messages: {
    value: (x, y) => x.concat(y),
    default: () => [],
  },
  projectId: {
    value: (x, y) => y ?? x,
    default: () => null,
  },
  feedback: {
    value: (x, y) => y ?? x,
    default: () => null,
  },
};

const codeWriterNode = async (state) => {
  console.log(`\n[${new Date().toISOString()}] 🤖 [Code Writer] Invoked`);
  
  // Bind tools to the model while maintaining fallbacks
  let requestedModel = process.env.AI_MODEL || "llama";
  if (requestedModel === "orchestrator") {
    requestedModel = "llama";
  }
  
  const modelWithTools = getSafeModelWithTools(
    requestedModel,
    [listFiles, readFiles, updateFiles, finishTask],
  );
  
  // getSafeModelWithTools falls back to llama if requestedModel is invalid.
  // We'll determine the actual model being used for accurate logging.
  let actualModel = requestedModel;
  try {
    // A quick hack to check if the model exists in the index
    const { getModel } = await import("../models/index.js");
    getModel(requestedModel);
  } catch (e) {
    actualModel = "llama (fallback due to invalid requested model: " + requestedModel + ")";
  }

  console.log(`[${new Date().toISOString()}] 🤖 [Code Writer] Using model: ${actualModel}`);

  const systemMessage = new SystemMessage(`You are an expert Code Writer agent. 
Your job is to write, read, and modify code based on the user's request.
CRITICAL INSTRUCTION: You MUST respond ONLY with tool calls! Do NOT output any conversational text, explanations, or reasoning whatsoever before or after your tool calls. 
IMPORTANT: ALWAYS use the list_files and read_files tools to analyze the directory structure BEFORE you create or overwrite any files! The user explicitly wants you to analyze the workspace first.
PERFORMANCE CRITICAL: When you need to create or update multiple files, you MUST batch them ALL into a SINGLE call to the create_or_update_files tool! NEVER call create_or_update_files multiple times sequentially. 
If you receive feedback from the Code Reviewer, you MUST address it and rewrite the code using the tools.
When you are completely finished fulfilling the user's request, use the finish_task tool.`);

  // Append system message to the beginning
  const messages = [systemMessage, ...state.messages];
  if (state.feedback) {
    console.log(`[${new Date().toISOString()}] 🤖 [Code Writer] Received feedback: ${state.feedback}`);
    messages.push(
      new HumanMessage(
        `Code Reviewer Feedback: ${state.feedback}. Please fix your implementation.`,
      ),
    );
  }

  console.log(`[${new Date().toISOString()}] 🤖 [Code Writer] Generating response... (this may take a few seconds)`);
  const startTime = Date.now();
  const response = await modelWithTools.invoke(messages);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log(`[${new Date().toISOString()}] 🤖 [Code Writer] Response generated in ${duration}s`);
  if (response.tool_calls && response.tool_calls.length > 0) {
    console.log(`[${new Date().toISOString()}] 🤖 [Code Writer] Tool calls requested:`, response.tool_calls.map(tc => tc.name));
  } else {
    console.log(`[${new Date().toISOString()}] 🤖 [Code Writer] No tool calls generated. Raw content length: ${response.content.length}`);
  }

  return { messages: [response], feedback: null };
};

const codeReviewerNode = async (state) => {
  console.log(`\n[${new Date().toISOString()}] 🔍 [Code Reviewer] Invoked`);
  
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage.content && lastMessage.content.includes("Sandbox agent unreachable")) {
    console.log(`[${new Date().toISOString()}] 🔍 [Code Reviewer] FATAL ERROR: Sandbox is unreachable.`);
    return { feedback: `FATAL ERROR: ${lastMessage.content}. Please ensure the sandbox container is running.` };
  }

  const rejectionCount = state.messages.filter(m => m.content && (m.content.includes("CRITICAL ERROR:") || m.content.includes("Error:"))).length;
  if (rejectionCount >= 3) {
    console.log(`[${new Date().toISOString()}] 🔍 [Code Reviewer] FATAL ERROR: Max rejections reached.`);
    return { feedback: "FATAL ERROR: AI failed to correctly use the required tools after multiple attempts. The task has been aborted to prevent an infinite loop. Please try again or switch to a more capable model.", approved: false };
  }

  if (lastMessage.content && typeof lastMessage.content === "string" && lastMessage.content.startsWith("Error:")) {
    console.log(`[${new Date().toISOString()}] 🔍 [Code Reviewer] Tool execution error detected.`);
    return { feedback: lastMessage.content, approved: false };
  }

  const isFromCodeWriter = lastMessage.constructor.name === "AIMessage" || lastMessage._getType && lastMessage._getType() === "ai" || lastMessage.type === "ai";
  if (isFromCodeWriter && (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0)) {
    console.log(`[${new Date().toISOString()}] 🔍 [Code Reviewer] REJECTED: No tool calls generated.`);
    return { feedback: "CRITICAL ERROR: You did not use any tools! You MUST use tools like 'create_or_update_files' to write code. Do not just output conversational text. Respond ONLY with tool calls." };
  }

  const hasFinished = state.messages.some(m => 
    m.tool_calls && m.tool_calls.some(tc => tc.name === "finish_task")
  );
  
  const hasCalledOtherTools = state.messages.some(m => 
    m.tool_calls && m.tool_calls.some(tc => tc.name !== "finish_task")
  );

  if (hasFinished && !hasCalledOtherTools) {
    console.log(`[${new Date().toISOString()}] 🔍 [Code Reviewer] REJECTED: Finished without doing work.`);
    return { feedback: "CRITICAL ERROR: You called 'finish_task' but you haven't actually done any work! You must use tools like 'create_or_update_files' or 'read_files' first to fulfill the user's request. Do not skip the work." };
  }

  if (!hasFinished) {
    console.log(`[${new Date().toISOString()}] 🔍 [Code Reviewer] REJECTED: Missing finish_task tool call.`);
    return { feedback: "CRITICAL ERROR: You did not use the 'finish_task' tool! You must actually execute this tool when you are completely done writing the code." };
  }

  console.log(`[${new Date().toISOString()}] 🔍 [Code Reviewer] Task completed successfully. Auto-approving.`);
  return { feedback: "APPROVED" };
};

const router = (state) => {
  console.log(`\n[${new Date().toISOString()}] 🔀 [Router] Evaluating state`);
  if (state.feedback === "APPROVED") {
    console.log(`[${new Date().toISOString()}] 🔀 [Router] Routing to END (APPROVED)`);
    return END;
  }
  if (state.feedback && state.feedback.startsWith("FATAL ERROR")) {
    console.log(`[${new Date().toISOString()}] 🔀 [Router] Routing to END (FATAL ERROR)`);
    return END;
  }
  if (state.feedback) {
    console.log(`[${new Date().toISOString()}] 🔀 [Router] Routing back to codeWriter`);
    return "codeWriter";
  }
  console.log(`[${new Date().toISOString()}] 🔀 [Router] Fallback: Routing to END`);
  return END;
};

const routeAfterWriter = (state) => {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage?.tool_calls?.length > 0) {
    return "tools";
  }
  return "codeReviewer";
};

const routeAfterTools = (state) => {
  const lastMessage = state.messages[state.messages.length - 1];
  console.log(`\n[${new Date().toISOString()}] 🔀 [RouteAfterTools] Evaluating tool completion. Last tool: ${lastMessage.name}`);
  
  if (lastMessage.content && lastMessage.content.includes("Sandbox agent unreachable")) {
    console.log(`[${new Date().toISOString()}] 🔀 [RouteAfterTools] Sandbox error detected! Routing to codeReviewer to trigger FATAL ERROR.`);
    return "codeReviewer";
  }

  if (lastMessage.content && typeof lastMessage.content === "string" && lastMessage.content.startsWith("Error:")) {
    console.log(`[${new Date().toISOString()}] 🔀 [RouteAfterTools] Tool error detected. Routing to codeReviewer.`);
    return "codeReviewer";
  }

  if (lastMessage.name === "finish_task") {
    console.log(`[${new Date().toISOString()}] 🔀 [RouteAfterTools] Task completion detected. Routing to codeReviewer to finalize.`);
    return "codeReviewer";
  }
  console.log(`[${new Date().toISOString()}] 🔀 [RouteAfterTools] Routing back to codeWriter.`);
  return "codeWriter";
};

// Build the graph
const workflow = new StateGraph({ channels: agentState })
  .addNode("codeWriter", codeWriterNode)
  .addNode("tools", new ToolNode([listFiles, readFiles, updateFiles, finishTask]))
  .addNode("codeReviewer", codeReviewerNode)
  .addEdge(START, "codeWriter")
  .addConditionalEdges("codeWriter", routeAfterWriter)
  .addConditionalEdges("tools", routeAfterTools) // After tools execute, route based on tool name
  .addConditionalEdges("codeReviewer", router);

// Add memory
const checkpointer = new MemorySaver();
export const multiAgentGraph = workflow.compile({ checkpointer });

export const invokeMultiAgent = async (params) => {
  const { messages, configurable } = params;

  // Create a unique thread ID for memory so graph state doesn't accumulate across HTTP requests
  const config = {
    configurable: {
      projectId: configurable.projectId,
      thread_id: `${configurable.projectId}-${Date.now()}`,
    },
  };

  // Optionally do a RAG lookup before starting if the user asked a question
  let initialMessages = [...messages];
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage && lastUserMessage.role === "user") {
    try {
      const docs = await searchCodebase(
        configurable.projectId,
        lastUserMessage.content,
      );
      if (docs && docs.length > 0) {
        const context = docs.map((d) => d.pageContent).join("\n\n");
        initialMessages.push(
          new SystemMessage(`Codebase Context from Vector DB:\n${context}`),
        );
      }
    } catch (err) {
      console.log(
        "Vector search failed or not initialized, continuing without RAG context.",
      );
    }
  }

  // Convert to proper Langchain Message objects
  const formattedMessages = initialMessages.map((m) => {
    if (m.role === "system") return new SystemMessage(m.content);
    if (m.role === "ai") return new AIMessage(m.content);
    return new HumanMessage(m.content);
  });

  const stream = await multiAgentGraph.streamEvents(
    { messages: formattedMessages, projectId: configurable.projectId },
    { ...config, version: "v2" },
  );

  let fullResponse = "";

  let finalState;
  for await (const event of stream) {
    // Keep track of the final state emitted by LangGraph
    if (event.event === "on_chain_end" && event.name === "LangGraph") {
      finalState = event.data?.output;
    }
    
    if (event.event === "on_tool_start") {
      if (configurable.writer) {
        let friendlyName = event.name;
        if (event.name === "create_or_update_files" || event.name === "update_files") friendlyName = "file updates";
        else if (event.name === "read_files") friendlyName = "file reads";
        else if (event.name === "list_files") friendlyName = "directory analysis";
        else if (event.name === "finish_task") friendlyName = "task completion";

        configurable.writer(
          `data: ${JSON.stringify({ status: `Executing ${friendlyName}...` })}\n\n`,
        );
      }
    } else if (event.event === "on_chat_model_stream") {
      const chunk = event.data?.chunk?.content;
      if (chunk && typeof chunk === "string") {
        fullResponse += chunk;
        if (configurable.writer) {
          configurable.writer(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }
      }
    }
  }

  // If a FATAL ERROR occurred or if nothing was streamed, inform the frontend
  if (finalState && finalState.feedback && finalState.feedback.startsWith("FATAL ERROR")) {
    const errorMsg = `\n\n[System] ${finalState.feedback}`;
    fullResponse += errorMsg;
    if (configurable.writer) {
      configurable.writer(`data: ${JSON.stringify({ text: errorMsg })}\n\n`);
    }
  } else if (!fullResponse) {
    const defaultMsg = "Task completed successfully.";
    fullResponse = defaultMsg;
    if (configurable.writer) {
      configurable.writer(`data: ${JSON.stringify({ text: defaultMsg })}\n\n`);
    }
  }

  return { content: fullResponse };
};
