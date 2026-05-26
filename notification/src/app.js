import express from "express";
import morgan from "morgan";
import { sendEmail } from "./services/mail.service.js";
import WelcomeEmail from "./email/WelcomeEmail.jsx";
import NewLoginEmail from "./email/NewLoginEmail.jsx";
import { setNotificationHandler, connectRabbitMQ } from "./config/mq.js";

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
  const { type, userId, timestamp, email, name, provider } = parsedMsg;

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
  }
});

// Boot up the resilient RabbitMQ connection loop
connectRabbitMQ();

export default app;
