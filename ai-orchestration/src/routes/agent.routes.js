import { Router } from "express";
import crypto from "crypto";
import { invokeMultiAgent, multiAgentGraph } from "../agents/multiAgentWorkflow.js";
import { SYSTEM_INSTRUCTION, llamaModel, getModel } from "../models/index.js";
import { ChatHistory } from "../models/chat.model.js";
import { ProjectMemory } from "../models/memory.model.js";
import { z } from "zod";
import { embedCodebase } from "../services/vectorStore.js";
import { runAutoFixer } from "../agents/autoFixer.agent.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { TokenUsage, trackTokenUsage } from "../models/tokenUsage.model.js";
import { redisClient } from "../config/redis.js";

const agentRouter = Router();

// Apply auth middleware to all routes
agentRouter.use(authMiddleware);

// Middleware to check daily token limit
const checkTokenLimit = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const date = new Date().toISOString().split('T')[0];
    const usage = await TokenUsage.findOne({ userId, date });
    const DAILY_LIMIT = 50000;
    
    if (usage && usage.tokensUsed >= DAILY_LIMIT) {
      return res.status(429).json({ error: "Daily token limit exceeded" });
    }
    next();
  } catch (error) {
    console.error("Token Limit Check Error:", error);
    // Don't block the request if the DB check fails, just proceed
    next();
  }
};

agentRouter.use(checkTokenLimit);

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

    const response = await invokeMultiAgent({
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        ...previousMessages,
        { role: "user", content: message }
      ],
      configurable: { projectId, writer }
    });

    const fullAiResponse = response.content;
    const tokens = response.tokens || 100; // Fallback estimate if token usage isn't present
    await trackTokenUsage(req.user.id || req.user._id, tokens);

    res.write(`data: ${JSON.stringify({ text: fullAiResponse })}\n\n`);

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
    const prompt = `You are a fast autocomplete engine. You are provided with a prefix and a suffix of a code file. 
Return ONLY the exact code that should be inserted between the prefix and suffix to complete the code. 
Do not add any markdown formatting, backticks, explanations, or chat. Just the raw code.

PREFIX:
${prefix || ""}

SUFFIX:
${suffix || ""}

MIDDLE:`;

    // Semantic Caching with Redis
    const cacheKey = `autocomplete:${crypto.createHash('sha256').update(prompt).digest('hex')}`;
    const cachedResponse = await redisClient.get(cacheKey);
    if (cachedResponse) {
      return res.status(200).json({ completion: cachedResponse });
    }

    const response = await llamaModel.invoke(prompt);
    
    // Cache the successful response for 1 hour
    await redisClient.setex(cacheKey, 3600, response.content);

    // Track tokens
    const tokens = response.response_metadata?.tokenUsage?.totalTokens || 50;
    await trackTokenUsage(req.user.id || req.user._id, tokens);

    return res.status(200).json({ completion: response.content });
  } catch (error) {
    console.error("Autocomplete Error:", error);
    res.status(500).json({ error: "Autocomplete failed" });
  }
});

agentRouter.post("/generate-db-schema", async (req, res) => {
  try {
    const { prompt, orm = "mongoose", modelName = "kimi" } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const model = getModel(modelName);
    const systemPrompt = `You are an expert database architect. The user will provide natural language requirements for a database schema.
You must output a JSON object with EXACTLY two string properties: "code" and "mermaid".
- "code": The full, complete, and valid ${orm} code (models/schema).
- "mermaid": The raw Mermaid ER Diagram syntax string describing the entities and relationships.

Do not include any markdown backticks for the JSON itself, just the raw JSON object.
Do not add any additional explanation or conversational text.`;

    const userPrompt = `Generate a ${orm} schema and Mermaid ER diagram for the following requirements:\n${prompt}`;

    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    let responseText = response.content.trim();
    // In case the LLM outputs markdown block for JSON, clean it
    if (responseText.startsWith("```json")) {
      responseText = responseText.replace(/^```json\n/, "").replace(/\n```$/, "");
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse DB schema JSON:", responseText);
      return res.status(500).json({ error: "LLM returned invalid JSON" });
    }

    // Track tokens
    const tokens = response.tokens || 300;
    await trackTokenUsage(req.user.id || req.user._id, tokens);

    res.status(200).json(parsedData);
  } catch (error) {
    console.error("DB Schema Generator Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate DB schema" });
  }
});

// Memory Routes
agentRouter.get("/memory/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const memories = await ProjectMemory.find({ projectId }).sort({ createdAt: -1 });
    res.status(200).json(memories);
  } catch (error) {
    console.error("Fetch memory error:", error);
    res.status(500).json({ error: "Failed to fetch project memory" });
  }
});

agentRouter.post("/memory", async (req, res) => {
  try {
    const { projectId, title, context } = req.body;
    if (!projectId || !title || !context) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const newMemory = await ProjectMemory.create({ projectId, title, context });
    res.status(201).json(newMemory);
  } catch (error) {
    console.error("Save memory error:", error);
    res.status(500).json({ error: "Failed to save memory" });
  }
});

agentRouter.post("/memory/query", async (req, res) => {
  try {
    const { projectId, query, modelName = "llama" } = req.body;
    
    if (!projectId || !query) {
      return res.status(400).json({ error: "projectId and query are required" });
    }

    // Retrieve all past decisions for this project
    const memories = await ProjectMemory.find({ projectId }).sort({ createdAt: 1 });
    const memoryContext = memories.map(m => `Title: ${m.title}\nDecision: ${m.context}`).join("\n\n");

    const systemPrompt = `You are the lead architect and memory assistant for this codebase.
You have access to the following logged architectural decisions for this project:
---
${memoryContext || "No architectural decisions recorded yet."}
---
Answer the user's question based strictly on the provided context if it relates to past decisions. If the context does not contain the answer, acknowledge that it was not recorded, but provide a highly educated guess on why such a decision might have been made based on general software engineering best practices. Be concise and professional.`;

    const model = getModel(modelName);
    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: query }
    ]);

    // Track tokens
    const tokens = response.tokens || 150;
    await trackTokenUsage(req.user.id || req.user._id, tokens);

    res.status(200).json({ answer: response.content });
  } catch (error) {
    console.error("Query memory error:", error);
    res.status(500).json({ error: "Failed to query project memory" });
  }
});

// Intent-Driven Development Route
agentRouter.post("/intent", async (req, res) => {
  try {
    const { intent, modelName = "kimi" } = req.body;
    
    if (!intent) {
      return res.status(400).json({ error: "Intent is required" });
    }

    const systemPrompt = `You are an expert full-stack developer. The user will describe a feature or component they want to build in plain English.
Your job is to generate ONLY the production-ready code that satisfies the user's intent.
CRITICAL INSTRUCTIONS:
- Return ONLY the raw code.
- Do NOT wrap the code in markdown formatting (like \`\`\`javascript or \`\`\`).
- Do NOT include any explanations, imports that don't belong in the file, or conversational text.
- If the user asks for a React component, return the complete, valid JSX file.
- If the user asks for an Express middleware, return the complete module.
- The output will be directly written into a source code file.`;

    const model = getModel(modelName);
    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: intent }
    ]);

    let generatedCode = response.content.trim();
    
    // Fallback: Strip markdown backticks if the model ignores the instruction
    if (generatedCode.startsWith('```')) {
      generatedCode = generatedCode.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
    }

    // Track tokens
    const tokens = response.tokens || 150;
    await trackTokenUsage(req.user.id || req.user._id, tokens);

    res.status(200).json({ code: generatedCode });
  } catch (error) {
    console.error("Intent generation error:", error);
    res.status(500).json({ error: "Failed to generate code from intent" });
  }
});

// Explain AI Routes
agentRouter.post("/explain-code", async (req, res) => {
  try {
    const { code, context, modelName = "llama" } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const systemPrompt = `You are an expert developer. The user will provide a snippet of code, and possibly the surrounding file context.
Your job is to provide a plain-English, line-by-line breakdown of what the highlighted code does.
Be concise but educational. Assume the user is a developer trying to understand complex logic.`;

    const userMessage = `Context (Optional):\n${context || 'None'}\n\nHighlighted Code:\n${code}\n\nPlease explain this code.`;

    const model = getModel(modelName);
    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ]);

    const tokens = response.tokens || 100;
    await trackTokenUsage(req.user.id || req.user._id, tokens);

    res.status(200).json({ explanation: response.content });
  } catch (error) {
    console.error("Explain code error:", error);
    res.status(500).json({ error: "Failed to explain code" });
  }
});

agentRouter.post("/explain-file", async (req, res) => {
  try {
    const { filePath, fileContent, modelName = "llama" } = req.body;
    
    if (!filePath || !fileContent) {
      return res.status(400).json({ error: "filePath and fileContent are required" });
    }

    const systemPrompt = `You are a Lead Software Architect. The user is asking you to explain a specific file in the codebase.
Analyze the provided file content and provide a high-level summary of its purpose, logic, and how it fits into the overall architecture.
Use markdown for formatting. Keep it structured and easy to read.`;

    const userMessage = `File: ${filePath}\n\nContent:\n${fileContent}\n\nPlease explain this file's architecture and logic.`;

    const model = getModel(modelName);
    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ]);

    const tokens = response.tokens || 200;
    await trackTokenUsage(req.user.id || req.user._id, tokens);

    res.status(200).json({ explanation: response.content });
  } catch (error) {
    console.error("Explain file error:", error);
    res.status(500).json({ error: "Failed to explain file" });
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

    // Cache lookup
    const cacheKey = `arch:${crypto.createHash('sha256').update(prompt).digest('hex')}`;
    const cachedArch = await redisClient.get(cacheKey);
    if (cachedArch) {
      return res.status(200).json(JSON.parse(cachedArch));
    }

    const structuredModel = llamaModel.withStructuredOutput(architectureSchema, { name: "architecture" });
    const response = await structuredModel.invoke(prompt);

    // Cache the response
    await redisClient.setex(cacheKey, 86400, JSON.stringify(response));

    // Track tokens
    const tokens = 300 + (files.length * 50); // estimate since structured output might not expose tokens easily
    await trackTokenUsage(req.user.id || req.user._id, tokens);

    return res.status(200).json(response);
  } catch (error) {
    console.error("Architecture extraction error:", error);
    return res.status(500).json({ error: "Failed to extract architecture" });
  }
});

agentRouter.post("/embed-codebase", async (req, res) => {
  try {
    const { projectId, files } = req.body;
    if (!projectId || !files || !Array.isArray(files)) {
      return res.status(400).json({ error: "projectId and files array are required" });
    }

    await embedCodebase(projectId, files);
    
    return res.status(200).json({ success: true, message: "Codebase embedded successfully" });
  } catch (error) {
    console.error("Embedding error:", error);
    return res.status(500).json({ error: "Failed to embed codebase" });
  }
});

agentRouter.post("/auto-fix", async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const result = await runAutoFixer(projectId);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Auto-fix error:", error);
    return res.status(500).json({ error: "Failed to run auto-fixer" });
  }
});

export default agentRouter;
