import { Router } from "express";
import passport from "passport";
import {
  googleCallback,
  githubCallback,
  logout,
  getCurrentUser,
  updateWebhook,
} from "../controllers/auth.controller.js";

const router = Router();

// Google Auth routes
router.get(
  "/google",
  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/api/auth/failure",
  }),
  googleCallback
);

// GitHub Auth routes
router.get(
  "/github",
  passport.authenticate("github", {
    session: false,
    scope: ["user:email"],
  })
);

router.get(
  "/github/callback",
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
router.post("/logout", logout);

// Get current authenticated user details
router.get("/me", getCurrentUser);

// Update user webhook
router.put("/webhook", updateWebhook);

export default router;