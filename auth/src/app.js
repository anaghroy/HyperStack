import "dotenv/config";
import express from "express";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import cookie from "cookie-parser";
import passport from "passport";
import { Strategy as GithubStrategy } from "passport-github2";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import authRoutes from "./routes/auth.routes.js";

const app = express();

// Trust proxy for rate limiting and real IPs when behind NGINX/Ingress
app.set('trust proxy', 1);

//use middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(cookie());
app.use(passport.initialize());

//Initialize GitHub Strategy
passport.use(
  new GithubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    },
  ),
);

//Initialize Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    },
  ),
);

//Health check APIs
app.get("/_status/healthz", (req, res) => {
  return res.json({
    message: "ok",
  });
});

app.get("/_status/readyz", (req, res) => {
  return res.json({
    message: "ok",
  });
});

app.use("/api/auth", authRoutes);

export default app;
