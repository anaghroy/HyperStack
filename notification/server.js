import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import app from './src/app.js';
import { setIoInstance } from "./src/app.js";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(userId);
    console.log(`User ${userId} connected to notifications socket.`);
  }

  socket.on("disconnect", () => {
    console.log(`User ${userId} disconnected.`);
  });
});

setIoInstance(io);

mongoose.connect(process.env.AUTH_MONGO_URI).then(() => {
    console.log("Notification service connected to Auth DB");
}).catch(err => console.error("Notification DB error:", err));

server.listen(4000, () => {
    console.log('Notification service is running on port 4000');
});