import { Router } from "express";
import passport from "passport";
import {
  googleCallback,
  githubCallback,
  logout,
  getCurrentUser,
  updateWebhook,
  updateProfile,
  updatePreferences,
  deleteAccount,
  refreshToken,
  getAuditLogs,
  getGithubRepos,
  getNotifications,
  markNotificationsRead
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authRateLimiter } from "../middlewares/rateLimiter.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Google Auth routes
router.get(
  "/google",
  authRateLimiter,
  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  authRateLimiter,
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/api/auth/failure",
  }),
  googleCallback
);

// GitHub Auth routes
router.get(
  "/github",
  authRateLimiter,
  passport.authenticate("github", {
    session: false,
    scope: ["user:email", "repo"],
  })
);

router.get(
  "/github/callback",
  authRateLimiter,
  passport.authenticate("github", {
    session: false,
    failureRedirect: "/api/auth/failure",
  }),
  githubCallback
);

// Authentication failure route
router.get("/failure", (req, res) => {
  return res.status(401).json({ message: "OAuth Authentication failed" });
});

// Logout route
router.post("/logout", authMiddleware, logout);

// Get current authenticated user details
router.get("/me", authMiddleware, getCurrentUser);

// Update user webhook
router.put("/webhook", authMiddleware, updateWebhook);

// Update user profile
router.put("/profile", authMiddleware, upload.single("avatar"), updateProfile);

// Update user preferences
router.put("/preferences", authMiddleware, updatePreferences);

// Delete user account
router.delete("/account", authMiddleware, deleteAccount);

// Refresh access token
router.post("/refresh", refreshToken);

// Get audit logs
router.get("/audit-logs", authMiddleware, getAuditLogs);

// Get Github Repos
router.get("/github/repos", authMiddleware, getGithubRepos);

// Notifications
router.get("/notifications", authMiddleware, getNotifications);
router.put("/notifications/read", authMiddleware, markNotificationsRead);

export default router;