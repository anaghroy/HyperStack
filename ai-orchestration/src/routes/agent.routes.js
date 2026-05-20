import { Router } from "express";
import agent from "../agents/code.agent.js";
import { SYSTEM_INSTRUCTION } from "../models/index.js";

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
    const stream = await agent.stream(
      {
        messages: [
          {
            role: "system",
            content: SYSTEM_INSTRUCTION,
          },
          {
            role: "user",
            content: message,
          },
        ],
      },
      {
        context: {
          projectId,
          writer,
        },
        streamMode: "values",
      },
    );

    let lastState = null;
    for await (const state of stream) {
      lastState = state;
    }

    if (lastState?.messages?.length) {
      const msgs = lastState.messages;
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        const role = m.role ?? m._getType?.();
        if ((role === "ai" || role === "assistant") && !m.tool_calls?.length) {
          const content =
            typeof m.content === "string"
              ? m.content
              : JSON.stringify(m.content);
          res.write(content + "\n");
          break;
        }
      }
    }

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
