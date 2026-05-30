import app from "./src/app.js";
import { connectDB } from "./src/config/database.js";
import { connectRedis } from "./src/config/redis.js";

connectDB();
connectRedis();

app.listen(3000, () => {
  console.log("Auth server is running on http://localhost:3000");

});
