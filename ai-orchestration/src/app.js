import express from "express";
import agentRouter from "./routes/agent.routes.js";
import morgan from "morgan";

const app = express();

app.use(express.json());
app.use(morgan("dev"));


app.get("/api/status/healthz", (req, res) => {
  res.status(200).json({
    message: "AI Orchestration is healthy",
    status: "success",
  });
});

app.get("/api/status/readyz", (req, res) => {
  res.status(200).json({
    message: "AI Orchestration is ready",
    status: "success",
  });
});

app.use("/api/ai", agentRouter)

export default app;


