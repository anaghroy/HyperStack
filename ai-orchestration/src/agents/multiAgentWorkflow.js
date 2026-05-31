import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { getModel } from "../models/index.js";
import { searchCodebase } from "../services/vectorStore.js";
import { listFiles, readFiles, updateFiles } from "./tools.js";

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
  }
};

const codeWriterNode = async (state) => {
  const model = getModel(process.env.AI_MODEL || "llama");
  // Bind tools to the model
  const modelWithTools = model.bindTools([listFiles, readFiles, updateFiles]);
  
  const systemMessage = new SystemMessage(`You are an expert Code Writer agent. 
Your job is to write, read, and modify code based on the user's request.
If you receive feedback from the Code Reviewer, you MUST address it and rewrite the code.
If you need to query the entire codebase for context, ask the user to clarify or just use readFiles.`);

  // Append system message to the beginning
  const messages = [systemMessage, ...state.messages];
  if (state.feedback) {
    messages.push(new HumanMessage(`Code Reviewer Feedback: ${state.feedback}. Please fix your implementation.`));
  }
  
  const response = await modelWithTools.invoke(messages);
  return { messages: [response], feedback: null };
};

const codeReviewerNode = async (state) => {
  const model = getModel(process.env.AI_MODEL || "llama");
  
  const systemMessage = new SystemMessage(`You are an expert Code Reviewer agent.
Review the latest AIMessage from the Code Writer.
If the code is correct, efficient, and meets the user's requirements, respond ONLY with "APPROVED".
If there are issues, bugs, or missing requirements, respond with constructive feedback explaining exactly what needs to be fixed.`);

  const messages = [systemMessage, ...state.messages];
  const response = await model.invoke(messages);
  
  if (response.content.trim() === "APPROVED") {
    return { feedback: "APPROVED" };
  } else {
    return { feedback: response.content };
  }
};

const router = (state) => {
  // If the reviewer approved, we are done
  if (state.feedback === "APPROVED") {
    return END;
  }
  // Otherwise, go back to the writer to fix issues
  if (state.feedback) {
    return "codeWriter";
  }
  // If no feedback yet, go to reviewer
  return "codeReviewer";
};

// Build the graph
const workflow = new StateGraph({ channels: agentState })
  .addNode("codeWriter", codeWriterNode)
  .addNode("codeReviewer", codeReviewerNode)
  .addEdge(START, "codeWriter")
  .addConditionalEdges("codeWriter", router)
  .addEdge("codeReviewer", "codeWriter"); // Reviewer always loops back to writer (conditional edge handles END)

// Add memory
const checkpointer = new MemorySaver();
export const multiAgentGraph = workflow.compile({ checkpointer });

export const invokeMultiAgent = async (params) => {
  const { messages, configurable } = params;
  
  // Create a thread ID for memory
  const config = {
    configurable: {
      thread_id: configurable.projectId,
    }
  };
  
  // Optionally do a RAG lookup before starting if the user asked a question
  let initialMessages = [...messages];
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage && lastUserMessage.role === "user") {
      try {
          const docs = await searchCodebase(configurable.projectId, lastUserMessage.content);
          if (docs && docs.length > 0) {
              const context = docs.map(d => d.pageContent).join("\n\n");
              initialMessages.push(new SystemMessage(`Codebase Context from Vector DB:\n${context}`));
          }
      } catch (err) {
          console.log("Vector search failed or not initialized, continuing without RAG context.");
      }
  }

  // Convert to proper Langchain Message objects
  const formattedMessages = initialMessages.map(m => {
    if (m.role === "system") return new SystemMessage(m.content);
    if (m.role === "ai") return new AIMessage(m.content);
    return new HumanMessage(m.content);
  });

  const response = await multiAgentGraph.invoke(
    { messages: formattedMessages, projectId: configurable.projectId },
    config
  );
  
  const lastMessage = response.messages[response.messages.length - 1];
  return { content: lastMessage.content || "Code approved and generated." };
};
