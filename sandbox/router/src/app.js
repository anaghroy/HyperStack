import express from "express";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createProxyServer } from "httpxy";
import http from "http";
import { refreshTTL, getPodInfo } from "../config/redis.js";

const app = express();
app.use(morgan("combined"));

app.get("/api/status/healthz", (req, res) =>
  res.status(200).json({ status: "ok" }),
);
app.get("/api/status/readyz", (req, res) =>
  res.status(200).json({ status: "ready" }),
);

// Single dynamic HTTP proxy for all sandboxes
const dynamicProxy = createProxyMiddleware({
  target: "http://127.0.0.1:9999", // Fallback target
  changeOrigin: true,
  router: async (req) => {
    const host = req.headers.host;
    if (!host) return "http://127.0.0.1:9999";

    const parts = host.split(".");
    const sandboxId = parts[0];
    const type = parts[1];

    const podInfo = await getPodInfo(sandboxId);
    if (!podInfo || !podInfo.podIp) return "http://127.0.0.1:9999"; // Pod not found or expired

    if (type === "agent") {
      return `http://${podInfo.podIp}:3000`;
    } else if (type === "preview") {
      return `http://${podInfo.podIp}:${podInfo.port}`;
    }
    return "http://127.0.0.1:9999";
  },
});

// Single httpxy proxy server for all WebsSocket upgrade
const wsProxy = createProxyServer({ changeOrigin: true });
wsProxy.on("error", (err, req, socket) => {
  console.error("WS proxy error:", err.message);
  socket.destroy();
});

app.use(async (req, res, next) => {
  const host = req.headers.host;
  if (!host) return next();

  const sandboxId = host.split(".")[0];
  await refreshTTL(sandboxId); // Refresh TTL on each request

  return dynamicProxy(req, res, next);
});

//Create the HTTP server explicitly
const server = http.createServer(app);

server.on("upgrade", async (req, socket, head) => {
  const host = req.headers.host;
  if (!host) {
    socket.destroy();
    return;
  }

  // Prevent EPIPE and connection-reset errors from crashing the process
  // during the active piped session (after ws() Promise has resolved)
  socket.on("error", () => socket.destroy());

  const sandboxId = host.split(".")[0];
  const type = host.split(".")[1];

  const podInfo = await getPodInfo(sandboxId);
  if (!podInfo || !podInfo.podIp) {
    socket.destroy();
    return;
  }

  console.log(
    `WS upgrade request: ${host}, sandboxId: ${sandboxId}, type: ${type}`,
  );

  if (type === "agent") {
    wsProxy
      .ws(req, socket, { target: `http://${podInfo.podIp}:3000` }, head)
      .catch(() => socket.destroy());
  } else if (type === "preview") {
    wsProxy
      .ws(req, socket, { target: `http://${podInfo.podIp}:${podInfo.port}` }, head)
      .catch(() => socket.destroy());
  } else {
    socket.destroy();
  }
});

export default server;
