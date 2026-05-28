import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { sendAuthNotification } from "../config/mq.js";

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

    const email =
      profile.emails && profile.emails[0] ? profile.emails[0].value : null;

    const name = profile.displayName || profile.username || "Google User";

    const avatar =
      profile.photos && profile.photos[0] ? profile.photos[0].value : null;

    if (!email) {
      return res
        .status(400)
        .json({ message: "Email not provided by Google account" });
    }

    let isNewUser = false;

    // Find or create user
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      // Check if user already exists with the same email
      user = await User.findOne({ email });

      if (user) {
        user.googleId = profile.id; // Link googleId to the existing user

        if (!user.avatar && avatar) {
          user.avatar = avatar;
        }

        await user.save();
      } else {
        isNewUser = true;

        user = new User({
          googleId: profile.id,
          email,
          name,
          avatar,
        });

        await user.save();
      }
    }

    /**
     * Delegate emails to Notification Service via RabbitMQ
     */
    if (isNewUser) {
      await sendAuthNotification({
        type: "WELCOME_EMAIL",
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        provider: "Google",
        timestamp: new Date()
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const clientRedirectUrl =
      process.env.FRONTEND_URL || "http://localhost:5173";

    return res.redirect(clientRedirectUrl);
  } catch (error) {
    console.error("Error in googleCallback:", error);

    return res.status(500).json({
      message: "Internal server error during Google login",
    });
  }
};

/**
 * Handles the GitHub OAuth callback.
 * Passport.js authenticates the request and attaches the profile to `req.user`.
 */

export const githubCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "GitHub authentication failed",
      });
    }

    const profile = req.user;

    const email =
      profile.emails && profile.emails[0]
        ? profile.emails[0].value
        : null;

    const name =
      profile.displayName || profile.username || "GitHub User";

    const avatar =
      profile.photos && profile.photos[0]
        ? profile.photos[0].value
        : null;

    // Fallback if GitHub email is private
    const finalEmail =
      email || `${profile.username || profile.id}@github.com`;

       let isNewUser = false;

    // Find existing GitHub user
    let user = await User.findOne({
      githubId: profile.id,
    });

    if (!user) {
      // Check if account already exists with same email
      user = await User.findOne({
        email: finalEmail,
      });

      if (user) {
        // Link GitHub account
        user.githubId = profile.id;

        if (!user.avatar && avatar) {
          user.avatar = avatar;
        }

        await user.save();
      } else {
        // Brand new user
        isNewUser = true;

        user = new User({
          githubId: profile.id,
          email: finalEmail,
          name,
          avatar,
        });

        await user.save();
      }
    }

    /**
     * Delegate emails to Notification Service via RabbitMQ
     */
    if (isNewUser) {
      await sendAuthNotification({
        type: "WELCOME_EMAIL",
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        provider: "GitHub",
        timestamp: new Date()
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    // Set auth cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend
    const clientRedirectUrl =
      process.env.FRONTEND_URL || "http://localhost:5173";

    return res.redirect(clientRedirectUrl);

  } catch (error) {
    console.error("Error in githubCallback:", error);

    return res.status(500).json({
      message: "Internal server error during GitHub login",
    });
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
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-__v");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid or expired token" });
  }
};

/**
 * Updates the current authenticated user's webhook URL.
 */
export const updateWebhook = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { webhookUrl } = req.body;

    const user = await User.findByIdAndUpdate(
      decoded.id,
      { webhookUrl },
      { new: true }
    ).select("-__v");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "Webhook URL updated successfully", user });
  } catch (error) {
    console.error("Error in updateWebhook:", error);
    return res
      .status(500)
      .json({ message: "Internal server error" });
  }
};
