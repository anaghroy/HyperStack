import Redis from "ioredis";
import { deletePod } from "../kubernetes/pod.js";

export const redis = new Redis(process.env.REDIS_URL);
const subscriber = new Redis(process.env.REDIS_URL);

export async function createSandboxKey(sandboxId, podIp, port = 5173) {
  await redis.set(
    `sandbox:${sandboxId}`,
    JSON.stringify({
      status: "active",
      podIp: podIp,
      port: port,
    }),
    "EX",
    1200,
  ); // Set key to expire in 1200 seconds (20 minutes)
}

export async function refreshSandboxKey(sandboxId) {
  // Reset the expiration timer back to 20 minutes
  await redis.expire(`sandbox:${sandboxId}`, 1200);
}

subscriber.config("SET", "notify-keyspace-events", "Ex", (err, res) => {
  if (err) {
    console.error("Error setting Redis config:", err);
  }
});
subscriber.subscribe("__keyevent@0__:expired", (err, count) => {
  if (err) {
    console.error("Failed to subscribe to Redis key expiration events:", err);
  }
});

subscriber.on("message", async (channel, key) => {
  const sandboxId = key.split(":")[1];
  try {
    // Delete the associated Kubernetes resources
    await deletePod(sandboxId);
  } catch (error) {
    console.error(`Failed to delete expired pod for sandbox ${sandboxId}:`, error.message);
  }
});

export default { subscriber };
