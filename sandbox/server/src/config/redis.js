import Redis from "ioredis";
import { deletePod } from "../kubernetes/pod.js";
import { deleteService } from "../kubernetes/service.js";

const redis = new Redis(process.env.REDIS_URL);
const subscriber = new Redis(process.env.REDIS_URL);

export async function createSandboxKey(sandboxId) {
  await redis.set(
    `sandbox:${sandboxId}`,
    JSON.stringify({
      status: "active",
    }),
    "EX",
    1200,
  ); // Set key to expire in 1200 seconds (20 minutes)
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
  // Delete the associated Kubernetes resources
  await deletePod(sandboxId);
  await deleteService(sandboxId);
});

export default { subscriber };
