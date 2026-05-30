import rateLimit from "express-rate-limit";

// Rate limiting for auth routes (e.g., 50 requests per 15 minutes)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 50, // Limit each IP to 50 requests per `window` (here, per 15 minutes)
  standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { message: "Too many requests from this IP, please try again after 15 minutes" },
});
