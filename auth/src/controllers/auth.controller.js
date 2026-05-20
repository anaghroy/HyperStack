import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

/**
 * Handles the Google OAuth callback.
 * Passport.js authenticates the request and attaches the profile to `req.user`.
 */
export const googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Google authentication failed" });
    }

    const profile = req.user;
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    const name = profile.displayName || profile.username || "Google User";
    const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

    if (!email) {
      return res.status(400).json({ message: "Email not provided by Google account" });
    }

    // Find or create the user based on googleId
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      // Check if user already exists with the same email
      user = await User.findOne({ email });

      if (user) {
        // Link googleId to the existing user
        user.googleId = profile.id;
        if (!user.avatar && avatar) {
          user.avatar = avatar;
        }
        await user.save();
      } else {
        // Create a new user
        user = new User({
          googleId: profile.id,
          email,
          name,
          avatar,
        });
        await user.save();
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set JWT in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect user back to the client application
    const clientRedirectUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(clientRedirectUrl);
  } catch (error) {
    console.error("Error in googleCallback:", error);
    return res.status(500).json({ message: "Internal server error during Google login" });
  }
};

/**
 * Handles the GitHub OAuth callback.
 * Passport.js authenticates the request and attaches the profile to `req.user`.
 */
export const githubCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "GitHub authentication failed" });
    }

    const profile = req.user;
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    const name = profile.displayName || profile.username || "GitHub User";
    const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

    // Fallback if the user has private/empty email on GitHub
    const finalEmail = email || `${profile.username || profile.id}@github.com`;

    // Find or create the user based on githubId
    let user = await User.findOne({ githubId: profile.id });

    if (!user) {
      // Check if user already exists with the same email
      user = await User.findOne({ email: finalEmail });

      if (user) {
        // Link githubId to the existing user
        user.githubId = profile.id;
        if (!user.avatar && avatar) {
          user.avatar = avatar;
        }
        await user.save();
      } else {
        // Create a new user
        user = new User({
          githubId: profile.id,
          email: finalEmail,
          name,
          avatar,
        });
        await user.save();
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set JWT in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect user back to the client application
    const clientRedirectUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(clientRedirectUrl);
  } catch (error) {
    console.error("Error in githubCallback:", error);
    return res.status(500).json({ message: "Internal server error during GitHub login" });
  }
};

/**
 * Logs out the user by clearing the JWT token cookie.
 */
export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return res.status(200).json({ message: "Logged out successfully" });
};

/**
 * Retrieves the current authenticated user's details based on the JWT token cookie.
 */
export const getCurrentUser = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-__v");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
  }
};
