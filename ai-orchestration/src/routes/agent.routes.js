import { Router } from "express";
import agent from "../agents/code.agent.js";
import { SYSTEM_INSTRUCTION } from "../models/index.js";
import { ChatHistory } from "../models/chat.model.js";

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

export default agentRouter;
