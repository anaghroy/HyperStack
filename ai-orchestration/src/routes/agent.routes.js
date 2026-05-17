import { Router } from "express";
import agent from "../agents/code.agent.js";
import { SYSTEM_INSTRUCTION } from "../models/index.js";

const agentRouter = Router();

agentRouter.post("/invoke", async (req, res) => {
  try {
    const { message, projectId } = req.body;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await agent.invoke(
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
        },
        streamMode: "custom",
      });

    for await (const chunk of response) {
      console.log(chunk);
      res.write(`data: ${chunk}\n\n`);
    }

    res.json({ response });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: "Failed to invoke agent",
    });
  }
});

export default agentRouter;
