import express from "express";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";
import http from "http";

const app = express();
app.use(morgan("combined"));

app.get("/api/status/healthz", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/api/status/readyz", (req, res) => res.status(200).json({ status: "ready" }));

const proxies = {};
const agentProxies = {};

function getProxy(sandboxId) {
  const target = `http://sandbox-service-${sandboxId}`;
  if (!proxies[sandboxId]) {
    proxies[sandboxId] = createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      on: {
        error: (err, req, res) => console.error(`Proxy error: ${err.message}`),
      },
    });
  }
  return proxies[sandboxId];
}

function getAgentProxy(sandboxId) {
  const target = `http://sandbox-service-${sandboxId}:3000`;
  if (!agentProxies[sandboxId]) {
    agentProxies[sandboxId] = createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      on: {
        error: (err, req, res) => console.error(`Agent proxy error: ${err.message}`),
      },
    });
  }
  return agentProxies[sandboxId];
}

app.use((req, res, next) => {
  const host = req.headers.host;
  const parts = host.split(".");
  const sandboxId = parts[0];
  const type = parts[1];

  if (type === "agent") {
    return getAgentProxy(sandboxId)(req, res, next);
  } else if (type === "preview") {
    return getProxy(sandboxId)(req, res, next);
  }
  next();
});

const server = http.createServer(app);

server.on("upgrade", (req, socket, head) => {
  const host = req.headers.host;
  const parts = host.split(".");
  const sandboxId = parts[0];
  const type = parts[1];

  console.log(`WS upgrade: host=${host} sandboxId=${sandboxId} type=${type}`);

  if (type === "agent") {
    getAgentProxy(sandboxId).upgrade(req, socket, head);
  } else if (type === "preview") {
    getProxy(sandboxId).upgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

export default server;