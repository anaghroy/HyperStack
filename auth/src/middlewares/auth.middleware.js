import jwt from "jsonwebtoken";
import { redisClient } from "../config/redis.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken || req.headers['authorization']?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    // Check Redis Blacklist
    const isBlacklisted = await redisClient.get(`blacklist_${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ message: "Unauthorized: Token is blacklisted" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains id and email
    req.token = token;  // Pass token to request so logout can blacklist it
    
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
  }
};
