import express from "express";
import morgan from "morgan";
import mongoose from "mongoose";
import { sendEmail } from "./services/mail.service.js";
import { sendWebhook } from "./services/webhook.service.js";
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

  let user = null;
  if (userId) {
    // Try to get user from DB directly to get webhookUrl
    try {
        const db = mongoose.connection.db;
        if (db) {
            user = await db.collection("users").findOne({ _id: new mongoose.Types.ObjectId(userId) });
        }
    } catch(err) {
        console.error("Failed to fetch user from DB:", err);
    }
  }

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
  } else if (type === "APP_NOTIFICATION") {
    // Emit to real-time socket
    if (ioInstance && userId) {
      ioInstance.to(userId).emit("notification", { message, timestamp: timestamp || new Date() });
    }
    
    // Dispatch to Webhook
    if (user && user.webhookUrl) {
      await sendWebhook(user.webhookUrl, `[HyperStack Alert]: ${message}`);
    }
  }
});

// Boot up the resilient RabbitMQ connection loop
connectRabbitMQ();

export default app;
