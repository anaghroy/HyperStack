import express from "express";
import morgan from "morgan";
import mongoose from "mongoose";
import { sendEmail } from "./services/mail.service.js";
import WelcomeEmail from "./email/WelcomeEmail.jsx";
import NewLoginEmail from "./email/NewLoginEmail.jsx";
import { setNotificationHandler, connectRabbitMQ } from "./config/mq.js";

let ioInstance = null;
export const setIoInstance = (io) => {
  ioInstance = io;
};

const app = express();
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("Hello from Notification Service!");
});

app.get("/_status/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/_status/readyz", (req, res) => {
  res.status(200).json({ status: "ready" });
});

// Register the handler BEFORE connecting to RabbitMQ
setNotificationHandler(async (messageContent) => {
  console.log("Received message from queue:", messageContent);

  const parsedMsg = JSON.parse(messageContent);
  const { type, userId, timestamp, email, name, provider, message } = parsedMsg;



  if (type === "WELCOME_EMAIL") {
    await sendEmail({
      to: email,
      subject: "Welcome to HyperStack!",
      template: WelcomeEmail,
      templateProps: { username: name, provider: provider || "your provider" }
    });
  } else if (type === "NEW_LOGIN") {
    await sendEmail({
      to: email,
      subject: "New Login Notification",
      template: NewLoginEmail,
      templateProps: { username: name, provider: provider || "your provider", timestamp: timestamp }
    });
  } else if (type === "APP_NOTIFICATION" || type === "SANDBOX_READY") {
    // Save to MongoDB
    if (userId) {
      try {
        const db = mongoose.connection.db;
        if (db) {
          await db.collection("notifications").insertOne({
            userId: new mongoose.Types.ObjectId(userId),
            type: type,
            message,
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      } catch (err) {
        console.error("Failed to save notification to DB:", err);
      }
    }

    // Emit to real-time socket
    if (ioInstance && userId) {
      ioInstance.to(userId).emit("notification", { type, message, timestamp: timestamp || new Date() });
    }

  }
});

// Boot up the resilient RabbitMQ connection loop
connectRabbitMQ();

export default app;
