import dotenv from "dotenv";
import app from "./src/app.js";
import { connectDB } from "./src/config/database.js";

connectDB();

app.listen(3000, () => {
  console.log("AI Orchestration is running on port 3000");
});
