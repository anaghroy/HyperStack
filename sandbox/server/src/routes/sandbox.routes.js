import express from "express";
import { createPod } from "../kubernetes/pod.js";
import { createService } from "../kubernetes/service.js";
import { v7 as uuid } from "uuid";
import { createSandboxKey, refreshSandboxKey } from "../config/redis.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import Project from "../models/project.model.js";
import { sendNotification } from "../config/mq.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Sandbox API is Healthy",
    status: "Ok",
  });
});

router.post("/project", authMiddleware, async (req, res) => {
  const { title, githubUrl } = req.body;

  const newProject = new Project({
    user: req.user.id,
    title,
    githubUrl: githubUrl || "",
  });

  await newProject.save();

  return res.status(201).json({
    message: "Project created successfully",
    project: newProject,
  });
});

router.post("/start", authMiddleware, async (req, res) => {
  try {
    const projectId = req.body.projectId;
    const project = await Project.findOne({
      _id: projectId,
      user: req.user.id,
    });

    if (!project) {
      return res
        .status(404)
        .json({ message: "Project not found or access denied" });
    }

    const sandboxId = uuid();

    await Promise.all([
      createPod(sandboxId, project.githubUrl), // Create pod with githubUrl if present
      createService(sandboxId), // Create service
      createSandboxKey(sandboxId), // Create sandbox key in Redis
    ]);

    // Dispatch real-time notification
    await sendNotification({
        type: "APP_NOTIFICATION",
        userId: req.user.id,
        message: `Your sandbox environment '${project.title}' is ready!`
    });

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

router.post("/heartbeat", authMiddleware, async (req, res) => {
  try {
    const { sandboxId } = req.body;
    if (!sandboxId) {
      return res.status(400).json({ message: "sandboxId is required" });
    }
    
    await refreshSandboxKey(sandboxId);
    
    return res.status(200).json({
      message: "Sandbox heartbeat successful",
    });
  } catch (error) {
    console.error("Error processing heartbeat:", error);
    return res.status(500).json({
      message: "Failed to process heartbeat",
      error: error.message,
    });
  }
});

router.get("/project", authMiddleware, async (req, res) => {
  const projects = await Project.find({ user: req.user.id });

  return res.status(200).json({
    message: "Projects retrieved successfully",
    projects,
  });
});

router.delete("/project/:id", authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findOneAndDelete({
      _id: projectId,
      user: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found or access denied" });
    }

    return res.status(200).json({
      message: "Project deleted successfully",
      projectId,
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return res.status(500).json({
      message: "Failed to delete project",
      error: error.message,
    });
  }
});

// Internal endpoint to delete all projects for a user (called when user deletes account)
router.delete("/user-projects/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    // In a production app, we would verify an internal API key or token here
    await Project.deleteMany({ user: userId });
    
    return res.status(200).json({
      message: "User projects deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user projects:", error);
    return res.status(500).json({
      message: "Failed to delete user projects",
      error: error.message,
    });
  }
});

export default router;
