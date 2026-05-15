import express from "express";
import morgan from "morgan";
import cors from "cors";
import sandboxRouter from "./routes/sandbox.routes.js";

const app = express();

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/sandbox", sandboxRouter);

export default app;

