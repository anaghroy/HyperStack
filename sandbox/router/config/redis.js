import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);


redis.on("connect", ()=>{
  console.log("Connected to Redis successfully.");
})

redis.on("error", (err)=>{
  console.error("Error connecting to Redis:", err);
});

export async function refreshTTL(sandboxId) {
  await redis.expire(`sandbox:${sandboxId}`, 1200); // Refresh key TTL to 1200 seconds (20 minutes)
}

export async function getPodIp(sandboxId) {
  const data = await redis.get(`sandbox:${sandboxId}`);
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    return parsed.podIp;
  } catch (err) {
    return null;
  }
}
