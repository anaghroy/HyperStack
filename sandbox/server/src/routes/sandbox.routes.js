import express from "express";
import { createPod } from "../kubernetes/pod.js";
import { v7 as uuid } from "uuid";
import { createSandboxKey, refreshSandboxKey } from "../config/redis.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import Project from "../models/project.model.js";
import { sendNotification } from "../config/mq.js";
import mongoose from "mongoose";

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

    // Create pod and wait for IP
    const { podIp } = await createPod(sandboxId, project.githubUrl);

    // Save mapping to Redis
    await createSandboxKey(sandboxId, podIp);

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

// GET /api/sandbox/shared-projects
router.get("/shared-projects", authMiddleware, async (req, res) => {
  try {
    const projects = await Project.find({ 'collaborators.user': req.user.id })
      .populate('user', 'name email avatar avatarUrl'); // Populate owner info
    
    return res.status(200).json({
      message: "Shared projects retrieved successfully",
      projects,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch shared projects", error: error.message });
  }
});

// POST /api/sandbox/project/:id/share
router.post("/project/:id/share", authMiddleware, async (req, res) => {
  try {
    const { email, role } = req.body;
    const projectId = req.params.id;

    const project = await Project.findOne({ _id: projectId, user: req.user.id });
    if (!project) return res.status(404).json({ message: "Project not found or you are not the owner" });

    // Lookup user by email directly from DB
    const db = mongoose.connection.db;
    const userToShare = await db.collection('users').findOne({ email });
    
    if (!userToShare) return res.status(404).json({ message: "User with this email not found" });
    if (userToShare._id.toString() === req.user.id) return res.status(400).json({ message: "Cannot share project with yourself" });

    // Check if already a collaborator
    const isAlreadyCollaborator = project.collaborators.find(c => c.user.toString() === userToShare._id.toString());
    if (isAlreadyCollaborator) return res.status(400).json({ message: "User is already a collaborator" });

    project.collaborators.push({
      user: userToShare._id,
      role: role || 'Editor'
    });

    await project.save();

    // Dispatch real-time notification to the invited user
    await sendNotification({
        type: "APP_NOTIFICATION",
        userId: userToShare._id.toString(),
        message: `You have been added as a ${role || 'Editor'} to project '${project.title}'`
    });

    return res.status(200).json({ message: "Project shared successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to share project", error: error.message });
  }
});

// DELETE /api/sandbox/project/:id/share (Leave Project)
router.delete("/project/:id/share", authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findOne({ _id: projectId, 'collaborators.user': req.user.id });
    
    if (!project) return res.status(404).json({ message: "Project not found or you are not a collaborator" });

    project.collaborators = project.collaborators.filter(c => c.user.toString() !== req.user.id);
    await project.save();

    // Optionally notify owner
    await sendNotification({
        type: "APP_NOTIFICATION",
        userId: project.user.toString(),
        message: `A collaborator has left your project '${project.title}'`
    });

    return res.status(200).json({ message: "Left project successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to leave project", error: error.message });
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
