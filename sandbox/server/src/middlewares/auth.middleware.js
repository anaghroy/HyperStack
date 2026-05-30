import { verifyToken } from "../utils.js";
import { redis } from "../config/redis.js";

export async function authMiddleware(req, res, next) {
    const token = req.cookies.accessToken || req.headers[ 'authorization' ]?.split(' ')[ 1 ];

    if (!token) {
        return res.status(401).json({ message: 'Authentication token is missing' });
    }

    try {
        const isBlacklisted = await redis.get(`blacklist_${token}`);
        if (isBlacklisted) {
            return res.status(401).json({ message: 'Unauthorized: Token is blacklisted' });
        }
    } catch (error) {
        console.error("Error checking token blacklist:", error);
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = decoded; // Attach user info to request object
    next();
}