import { Router } from "express";
import agent from "../agents/code.agent.js";
import { SYSTEM_INSTRUCTION, llamaModel } from "../models/index.js";
import { ChatHistory } from "../models/chat.model.js";
import { z } from "zod";

const agentRouter = Router();

agentRouter.post("/invoke", async (req, res) => {
  try {
    const { message, projectId } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const writer = (text) => res.write(text);
    
    // Fetch existing chat history for this project
    let chatDoc = await ChatHistory.findOne({ projectId });
    if (!chatDoc) {
      chatDoc = new ChatHistory({ projectId, messages: [] });
    }

    // Format messages for LangChain
    const previousMessages = chatDoc.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const stream = await agent.stream(
      {
        messages: [
          {
            role: "system",
            content: SYSTEM_INSTRUCTION,
          },
          ...previousMessages,
          {
            role: "user",
            content: message,
          },
        ],
      },
      {
        configurable: {
          projectId,
          writer,
        },
        streamMode: "values",
      },
    );

    let fullAiResponse = "";

    for await (const event of stream) {
      if (event.event === "on_chat_model_stream" && event.data?.chunk?.content) {
        let content = event.data.chunk.content;
        if (typeof content === "string") {
          fullAiResponse += content;
          res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
        } else if (Array.isArray(content)) {
          // In some models, stream chunks can be arrays of text parts
          for (const part of content) {
            if (part.type === "text" && part.text) {
              fullAiResponse += part.text;
              res.write(`data: ${JSON.stringify({ text: part.text })}\n\n`);
            }
          }
        }
      }
    }

    // Save to DB
    chatDoc.messages.push({ role: "user", content: message });
    chatDoc.messages.push({ role: "ai", content: fullAiResponse });
    await chatDoc.save();

    res.end();
  } catch (error) {
    console.error(error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      return res.end();
    } else {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
});

agentRouter.post("/autocomplete", async (req, res) => {
  try {
    const { prefix, suffix } = req.body;
    
    // We construct a simple prompt to get the missing code.
    // Llama 3 handles instructions well.
    const prompt = `You are a fast autocomplete engine. You are provided with a prefix and a suffix of a code file. 
Return ONLY the exact code that should be inserted between the prefix and suffix to complete the code. 
Do not add any markdown formatting, backticks, explanations, or chat. Just the raw code.

PREFIX:
${prefix || ""}

SUFFIX:
${suffix || ""}

MIDDLE:`;

    const response = await llamaModel.invoke(prompt);
    
    return res.status(200).json({ completion: response.content });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return res.status(500).json({ error: "Failed to generate autocomplete" });
  }
});

agentRouter.post("/architecture", async (req, res) => {
  try {
    const { files } = req.body;
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: "Files array is required" });
    }

    const architectureSchema = z.object({
      nodes: z.array(z.object({
        id: z.string().describe("The file path, e.g. 'src/App.jsx'"),
        label: z.string().describe("The file name, e.g. 'App.jsx'"),
        type: z.string().describe("The type of node, e.g. 'component', 'utility', 'css', etc.")
      })).describe("List of all files and folders as nodes"),
      edges: z.array(z.object({
        source: z.string().describe("The file path that imports the target"),
        target: z.string().describe("The file path that is imported"),
        label: z.string().optional().describe("Type of connection, e.g. 'imports'")
      })).describe("List of connections between files based on imports")
    });

    const prompt = `You are an expert software architect. Analyze the provided file contents and determine the dependency graph between the files based on imports and requires.
Return a structured representation of the architecture with nodes (files) and edges (dependencies where 'source' imports 'target').

FILES:
${files.map(f => `--- FILE: ${f.path} ---\n${f.content || 'Empty file'}\n`).join('\n')}

Analyze these files and return the JSON architecture graph.`;

    // Some models (like smaller local llamas) might struggle with .withStructuredOutput depending on the provider, 
    // but assuming standard LangChain usage:
    const structuredModel = llamaModel.withStructuredOutput(architectureSchema, { name: "architecture" });
    const response = await structuredModel.invoke(prompt);

    return res.status(200).json(response);
  } catch (error) {
    console.error("Architecture extraction error:", error);
    // Fallback if structured output fails
    return res.status(500).json({ error: "Failed to extract architecture" });
  }
});

export default agentRouter;
