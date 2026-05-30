import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("connect", () => {
  console.log("Redis Connected");
});

redisClient.on("error", (err) => {
  console.log("Redis Error:", err);
});


/**Connecting to Redis */
export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

export { redisClient };
