import express from "express";
import { createPod } from "../kubernetes/pod.js";
import { createService } from "../kubernetes/service.js";
import { v7 as uuid } from "uuid";
import { createSandboxKey } from '../config/redis.js';

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Sandbox API is Healthy",
    status: "Ok",
  });
});

router.post("/start", async (req, res) => {
  try {
    const sandboxId = uuid();

    await Promise.all([
      createPod(sandboxId), // Create pod
      createService(sandboxId), // Create service
      createSandboxKey(sandboxId), // Create sandbox key in Redis
    ]);

    return res.status(201).json({
      message: "Sandbox environment created successfully",
      sandboxId,
      previewUrl: `http://${sandboxId}.preview.localhost`,
    });
  } catch (error) {
    console.error("Error while creating sandbox:", error);
    return res.status(500).json({
      message: "Failed to create sandbox",
      error: error.message,
    });
  }
});

export default router;
