import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import AuditLog from "../models/auditLog.model.js";
import Notification from "../models/notification.model.js";
import { sendAuthNotification } from "../config/mq.js";
import { redisClient } from "../config/redis.js";
import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

const generateTokens = async (res, user) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // Store refresh token in Redis
  await redisClient.setEx(`refresh_${user._id}`, 7 * 24 * 60 * 60, refreshToken);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

const createAuditLog = async (req, userId, provider, status, message = "") => {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || "Unknown";
    await AuditLog.create({
      userId,
      ipAddress,
      userAgent,
      provider,
      status,
      message
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};

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

    // Generate and set tokens
    await generateTokens(res, user);

    // Audit Log
    await createAuditLog(req, user._id, "Google", "Success", "Logged in successfully");

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

export const getGithubRepos = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.githubAccessToken) {
      return res.status(400).json({ error: "User is not connected to GitHub or missing access token" });
    }

    const response = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
      headers: {
        Authorization: `token ${user.githubAccessToken}`,
        Accept: "application/vnd.github.v3+json"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch repositories from GitHub" });
    }

    const repos = await response.json();

    return res.status(200).json({ repos: simplifiedRepos });
  } catch (error) {
    console.error("Error fetching GitHub repos:", error);
    return res.status(500).json({ message: "Internal server error fetching GitHub repos." });
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

    if (user && profile.accessToken) {
      user.githubAccessToken = profile.accessToken;
      await user.save();
    }

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

        if (profile.accessToken) {
          user.githubAccessToken = profile.accessToken;
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
          githubAccessToken: profile.accessToken,
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

    // Generate and set tokens
    await generateTokens(res, user);

    // Audit Log
    await createAuditLog(req, user._id, "GitHub", "Success", "Logged in successfully");

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
 * Logs out the user by clearing the JWT token cookie and blacklisting the token in Redis.
 */
export const logout = async (req, res) => {
  try {
    const token = req.token;
    if (token && req.user && req.user.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      const timeRemaining = req.user.exp - currentTime;
      if (timeRemaining > 0) {
        await redisClient.setEx(`blacklist_${token}`, timeRemaining, "true");
      }
    }

    if (req.user && req.user.id) {
      await redisClient.del(`refresh_${req.user.id}`);
    }

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error in logout:", error);
    return res.status(500).json({ message: "Internal server error during logout" });
  }
};

/**
 * Retrieves the current authenticated user's details based on the JWT token cookie.
 */
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-__v");
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
 * Updates the user's profile details and avatar.
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, location, city, dob, bio } = req.body;
    
    if (bio && bio.length > 200) {
      return res.status(400).json({ message: "Bio must be at most 200 characters long." });
    }

    let user = await User.findById(req.user.id).select("-__v");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if there is an avatar file
    if (req.file) {
      const fileBuffer = req.file.buffer;
      const fileName = `avatar_${user._id}_${Date.now()}`;
      
      const uploadResponse = await imagekit.upload({
        file: fileBuffer,
        fileName: fileName,
        folder: "HyperStack/avatars",
        useUniqueFileName: false
      });
      
      user.avatar = uploadResponse.url;
    }

    if (name !== undefined) user.name = name;
    if (location !== undefined) user.location = location;
    if (city !== undefined) user.city = city;
    if (dob !== undefined) user.dob = dob;
    if (bio !== undefined) user.bio = bio;


    await user.save();
    return res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Updates the user's account preferences.
 */
export const updatePreferences = async (req, res) => {
  try {
    const { twoFactorEnabled, emailNotifications } = req.body;

    let user = await User.findById(req.user.id).select("-__v");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (twoFactorEnabled !== undefined) user.twoFactorEnabled = twoFactorEnabled;
    if (emailNotifications !== undefined) user.emailNotifications = emailNotifications;


    await user.save();
    return res.status(200).json({ message: "Preferences updated successfully", user });
  } catch (error) {
    console.error("Error in updatePreferences:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Deletes the user account and associated projects.
 */
export const deleteAccount = async (req, res) => {
  try {
    // Delete user from Auth DB
    const user = await User.findByIdAndDelete(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Call Sandbox service to delete associated projects
    try {
      // Assuming Sandbox service is running internally on port 3000
      const sandboxUrl = process.env.SANDBOX_API_URL || "http://localhost:3000";
      await fetch(`${sandboxUrl}/api/sandbox/user-projects/${req.user.id}`, {
        method: "DELETE"
      });
    } catch (sandboxError) {
      console.error("Failed to delete user projects in sandbox:", sandboxError);
      // We still proceed since the user account is deleted
    }

    await redisClient.del(`refresh_${req.user.id}`);

    // Clear cookies
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error in deleteAccount:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
  }


/**
 * Refreshes the short-lived access token using the long-lived refresh token.
 */
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Unauthorized: No refresh token provided" });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);
    const userId = decoded.id;

    const storedToken = await redisClient.get(`refresh_${userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      return res.status(401).json({ message: "Unauthorized: Invalid or revoked refresh token" });
    }

    const user = await User.findById(userId).select("-__v");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Issue a new access token
    const newAccessToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    return res.status(200).json({ message: "Token refreshed successfully" });
  } catch (error) {
    console.error("Error in refreshToken:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid or expired refresh token" });
  }
};

/**
 * Retrieves the user's login history.
 */
export const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
      
    return res.status(200).json({ logs });
  } catch (error) {
    console.error("Error in getAuditLogs:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

export const markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.status(200).json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Error marking notifications read:", error);
    res.status(500).json({ error: "Failed to update notifications" });
  }
};
