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
    const DAILY_LIMIT = 500000;
    
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

    let requestAborted = false;
    req.on('close', () => {
      requestAborted = true;
    });

    const writer = (text) => {
      if (!requestAborted) res.write(text);
    };
    
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
    
    if (!requestAborted) {
      await trackTokenUsage(req.user.id || req.user._id, tokens);

      // Stream has already been written via writer; no need to send full response again

      // Save to DB
      chatDoc.messages.push({ role: "user", content: message });
      chatDoc.messages.push({ role: "ai", content: fullAiResponse });
      await chatDoc.save();

      res.end();
    }
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

agentRouter.get("/history/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const chatDoc = await ChatHistory.findOne({ projectId });
    if (!chatDoc) {
      return res.status(200).json({ messages: [] });
    }
    return res.status(200).json({ messages: chatDoc.messages });
  } catch (error) {
    return res.status(500).json({ error: error.message });
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

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    const dbModelsToTry = [modelName, "cohere", "mistral", "deepseek", "qwen", "minimax"];
    let parsedData = null;
    let finalTokens = 300;
    
    for (const currentModelName of dbModelsToTry) {
      try {
        console.log(`Calling DB Schema Model: ${currentModelName}`);
        const currentModel = getModel(currentModelName);
        const response = await currentModel.invoke(messages);
        let responseText = response.content.trim();
        finalTokens = response.tokens || 300;
        
        if (responseText.startsWith("```json")) {
          responseText = responseText.replace(/^```json\n/, "").replace(/\n```$/, "");
        }
        
        let jsonContent = responseText;
        const firstBrace = jsonContent.indexOf('{');
        const lastBrace = jsonContent.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
        }
        
        try {
          parsedData = JSON.parse(jsonContent);
          if (parsedData.code && parsedData.mermaid) {
             console.log(`${currentModelName} successfully generated DB schema!`);
             break; // Success!
          }
        } catch (parseError) {
          console.warn(`${currentModelName} failed JSON parse, attempting markdown extraction...`);
          const mermaidMatch = responseText.match(/```mermaid([\s\S]*?)```/i);
          const mermaidStr = mermaidMatch ? mermaidMatch[1].trim() : "";
          
          const codeMatches = [...responseText.matchAll(/```(\w*)([\s\S]*?)```/gi)];
          let codeStr = "";
          for (const match of codeMatches) {
            const lang = (match[1] || "").toLowerCase();
            if (lang !== "mermaid" && lang !== "json") {
                codeStr = match[2].trim();
                break;
            }
          }
          
          if (codeStr || mermaidStr) {
            parsedData = {
              code: codeStr || "// Schema could not be extracted",
              mermaid: mermaidStr || "erDiagram\n    ERROR ||--o{ ERROR : missing_diagram"
            };
            console.log(`${currentModelName} successfully generated DB schema via markdown!`);
            break; // Success!
          } else {
            throw new Error("Invalid JSON and no markdown blocks found");
          }
        }
      } catch (err) {
        console.warn(`Model ${currentModelName} failed:`, err.message);
        // Continue to next model
      }
    }
    
    if (!parsedData) {
      console.error("All DB models failed to generate valid schema.");
      return res.status(500).json({ error: "All AI models failed to generate DB schema." });
    }

    // Track tokens
    await trackTokenUsage(req.user.id || req.user._id, finalTokens);

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

// Generate Docs Route
agentRouter.post("/generate-docs", async (req, res) => {
  try {
    const { code, format = "swagger", modelName = "llama" } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: "Router code is required" });
    }

    let systemPrompt = `You are an expert API documentation writer. The user will provide the raw code of an Express router or API file.
Your job is to analyze the file and output comprehensive API documentation.`;

    if (format === "swagger") {
      systemPrompt += `\nOutput a valid OpenAPI/Swagger YAML specification for all the endpoints found in the file.
Include paths, HTTP methods, parameters, request bodies, and typical responses.
Return ONLY the raw YAML code. Do not wrap it in markdown backticks.`;
    } else {
      systemPrompt += `\nOutput a clean, structured Markdown README documenting all the endpoints found in the file.
Include the route path, HTTP method, description, required body/query parameters, and response examples.
Return ONLY the Markdown content. Do not wrap the entire response in markdown backticks unless strictly necessary.`;
    }

    const model = getModel(modelName);
    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here is the API router code:\n\n${code}` }
    ]);

    let generatedDocs = response.content.trim();
    
    // Fallback: Strip markdown backticks if the model ignores the instruction for YAML
    if (format === "swagger" && generatedDocs.startsWith('```')) {
      generatedDocs = generatedDocs.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
    }

    // Track tokens
    const tokens = response.tokens || 200;
    await trackTokenUsage(req.user.id || req.user._id, tokens);

    res.status(200).json({ docs: generatedDocs });
  } catch (error) {
    console.error("Generate docs error:", error);
    res.status(500).json({ error: "Failed to generate documentation" });
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

    let response;
    let usedAiTokens = 0;
    
    const manualPrompt = prompt + `\n\nCRITICAL INSTRUCTION: You must respond ONLY with raw, valid JSON. Do not use markdown code blocks (e.g. \`\`\`json). Your entire response must start with { and end with }. 
The JSON must strictly follow this schema:
{
  "nodes": [ { "id": "file/path.js", "label": "path.js", "type": "component/utility/css/file" } ],
  "edges": [ { "source": "file/path.js", "target": "imported/file.js", "label": "imports" } ]
}
Do not include any explanations. Keep the output as compact as possible.`;

    try {
      console.log("Calling Cohere (Primary Model) for architecture extraction...");
      const { cohereModel } = await import("../models/cohere.model.js");
      
      const result = await cohereModel.invoke(manualPrompt);
      let content = result.content || "";
      content = content.replace(/^```json/m, '').replace(/^```/m, '').replace(/```$/m, '').trim();
      
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        content = content.substring(firstBrace, lastBrace + 1);
      }
      
      const parsed = JSON.parse(content);
      response = parsed.architecture || parsed.graph || parsed;
      
      if (!response || !Array.isArray(response.nodes) || response.nodes.length === 0) {
        throw new Error("Missing or empty nodes array");
      }
      
      usedAiTokens = 300 + (files.length * 50);
      console.log("Cohere successfully generated the architecture graph!");
    } catch (cohereError) {
      console.warn("Cohere failed to generate architecture graph:", cohereError.message);
      let aiSuccess = false;
      const fallbackModels = ["mistral", "kimi", "deepseek", "minimax"];
      const { getModel } = await import("../models/index.js");
      for (const modelName of fallbackModels) {
        if (aiSuccess) break;
        try {
          console.log(`Trying fallback model: ${modelName}`);
          const currentModel = getModel(modelName);
          const largeModel = currentModel.bind ? currentModel.bind({ max_tokens: 8192 }) : currentModel;
          
          const result = await largeModel.invoke(manualPrompt);
          let content = result.content || "";
          
          content = content.replace(/^```json/m, '').replace(/^```/m, '').replace(/```$/m, '').trim();
          
          // Strictly extract the JSON object by finding the first '{' and last '}'
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            content = content.substring(firstBrace, lastBrace + 1);
          }
          
          try {
            const parsed = JSON.parse(content);
            response = parsed.architecture || parsed.graph || parsed;
            
            // Validate that we actually got a nodes array
            if (response && Array.isArray(response.nodes) && response.nodes.length > 0) {
              aiSuccess = true;
            } else {
              throw new Error("Missing or empty nodes array");
            }
          } catch (parseErr) {
            console.warn(`${modelName} JSON parse/validate failed:`, parseErr.message);
            
            // Attempt repair if it's a truncation issue
            let repaired = content;
            if (repaired.lastIndexOf(']') < repaired.lastIndexOf('{')) {
              repaired += '"}]}';
            } else if (repaired.lastIndexOf('}') < repaired.lastIndexOf('[')) {
              repaired += ']}';
            } else if (!repaired.endsWith('}')) {
              repaired += '}';
            }
            
            try {
              const repairedParsed = JSON.parse(repaired);
              response = repairedParsed.architecture || repairedParsed.graph || repairedParsed;
              if (response && Array.isArray(response.nodes) && response.nodes.length > 0) {
                aiSuccess = true;
              }
            } catch (repairErr) {
               // Let it fail and try the next model
            }
          }
          
          if (aiSuccess) {
            usedAiTokens = 300 + (files.length * 50);
            console.log(`${modelName} successfully generated the architecture.`);
          }
        } catch (fallbackErr) {
          console.warn(`${modelName} fallback failed:`, fallbackErr.message);
        }
      }

      if (!aiSuccess) {
        console.error("All AI models failed, using Regex fallback parser. Charging 0 tokens.");
        usedAiTokens = 0; // Regex fallback is free!
        
        response = { nodes: [], edges: [] };
        files.forEach(f => {
          const label = f.path.split('/').pop();
          let type = 'file';
          if (f.path.includes('components')) type = 'component';
          else if (f.path.includes('utils') || f.path.includes('services')) type = 'utility';
          else if (f.path.endsWith('.css') || f.path.endsWith('.scss')) type = 'css';
          
          response.nodes.push({ id: f.path, label, type });
          
          const importRegex = /(?:import|require)[^\n]+['"]([^'"]+)['"]/g;
          let match;
          while ((match = importRegex.exec(f.content)) !== null) {
            const importPath = match[1];
            
            // Skip standard node_modules (if it doesn't start with . or / or @)
            if (!importPath.startsWith('.') && !importPath.startsWith('/') && !importPath.startsWith('@')) continue;

            // Extract the base filename (e.g., './components/App' -> 'App')
            const targetName = importPath.split('/').pop().replace(/\.(js|jsx|ts|tsx)$/, '');
            
            // Fuzzy match the node by label
            const targetNode = response.nodes.find(n => n.label.toLowerCase().startsWith(targetName.toLowerCase()));
            
            if (targetNode) {
              response.edges.push({ source: f.path, target: targetNode.id, label: 'imports' });
            }
          }
        });
      }
    }

    // Cache the response
    await redisClient.setex(cacheKey, 86400, JSON.stringify(response));

    // Track tokens only if AI was used
    if (usedAiTokens > 0) {
      await trackTokenUsage(req.user.id || req.user._id, usedAiTokens);
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Architecture extraction error:", error);
    return res.status(500).json({ 
      error: "Failed to extract architecture", 
      details: error.message,
      stack: error.stack 
    });
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

agentRouter.post("/generate-tests", async (req, res) => {
  try {
    const { code, fileName, framework } = req.body;
    if (!code || !fileName) {
      return res.status(400).json({ error: "code and fileName are required" });
    }

    const testFramework = framework || "jest";

    const systemPrompt = `You are an expert Software Test Engineer. Your task is to write a comprehensive, robust, and production-ready unit test suite for the provided code using ${testFramework}.
Focus on:
1. Covering both success and edge cases.
2. Mocking necessary external dependencies.
3. Clean and maintainable test code.
Do not include any conversational text. Return ONLY the raw test code. If you must use backticks, make sure the entire response is valid code.`;

    const modelName = req.body.modelName || "kimi";
    const model = getModel(modelName);

    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: `File: ${fileName}\n\nCode:\n${code}` }
    ]);

    let generatedTests = response.content.trim();
    
    // Strip markdown formatting if present
    if (generatedTests.startsWith('\`\`\`')) {
      generatedTests = generatedTests.replace(/^\`\`\`[a-z]*\n/, '').replace(/\n\`\`\`$/, '');
    }

    const tokens = response.tokens || 300;
    await trackTokenUsage(req.user.id || req.user._id, tokens);

    res.status(200).json({ tests: generatedTests });
  } catch (error) {
    console.error("Generate tests error:", error);
    res.status(500).json({ error: "Failed to generate tests" });
  }
});

agentRouter.post("/commit", async (req, res) => {
  try {
    const { gitInfo, type } = req.body;
    if (!gitInfo) {
      return res.status(400).json({ error: "gitInfo is required" });
    }

    const isPR = type === 'pr';
    const systemPrompt = isPR 
      ? `You are an expert developer. Based on the provided git status and git diff, write a comprehensive Pull Request Summary in Markdown.
Include:
- A clear PR Title
- A summary of what was changed and why
- A bulleted list of specific file changes
Do not include conversational text, just the Markdown output.`
      : `You are an expert developer. Based on the provided git status and git diff, write a conventional commit message.
Format:
<type>(<optional scope>): <description>

[optional body explaining *why* the change was made]

Do not include conversational text, just the raw commit message text.`;

    const modelName = req.body.modelName || "kimi";
    const model = getModel(modelName);

    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Git Info:\n\n${gitInfo}` }
    ]);

    let generatedText = response.content.trim();
    
    // Strip markdown formatting if present and it's a commit message
    if (!isPR && generatedText.startsWith('\`\`\`')) {
      generatedText = generatedText.replace(/^\`\`\`[a-z]*\n/, '').replace(/\n\`\`\`$/, '');
    }

    const tokens = response.tokens || 150;
    await trackTokenUsage(req.user.id || req.user._id, tokens);

    res.status(200).json({ text: generatedText });
  } catch (error) {
    console.error("Generate commit/PR error:", error);
    res.status(500).json({ error: "Failed to generate text" });
  }
});

export default agentRouter;
