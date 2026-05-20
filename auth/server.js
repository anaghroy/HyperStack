import app from "./src/app.js";
import { connectDB } from "./src/config/database.js";

connectDB();

app.listen(3000, () => {
  console.log("Auth server is running on http://localhost:3000");

});
