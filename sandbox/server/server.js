import "dotenv/config";
import app from "./src/app.js";
import connectDB from "./src/config/database.js";
import { connectRabbitMQ } from "./src/config/mq.js";

// Connect to MongoDB
connectDB();
// Connect to RabbitMQ
connectRabbitMQ();

app.listen(3000, () => {
  console.log("Sandbox API is running on PORT: 3000");
});