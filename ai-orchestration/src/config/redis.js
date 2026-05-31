import Redis from "ioredis";

export const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on("connect", () => {
  console.log("Redis Connected in AI Orchestration");
});

redisClient.on("error", (err) => {
  console.log("Redis Error in AI Orchestration:", err);
});
