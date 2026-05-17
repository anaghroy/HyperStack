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


    console.log("Starting AI invoke");
    const response = await agent.stream(
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
      },
    );

    for await (const chunk of response) {
      console.log(chunk);
      res.write(`data: ${chunk}\n\n`);
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
