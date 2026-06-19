import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// helper — generate JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// ─── Register ────────────────────────────────────────────────────────────────
// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, photoURL } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    }

    // check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      photoURL: photoURL || "",
      provider: "email",
    });

    const token = generateToken(user._id);

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role,
        isPremium: user.isPremium,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// ─── Login ───────────────────────────────────────────────────────────────────
// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Google-only users have no password
    if (!user.password) {
      return res
        .status(401)
        .json({ message: "This account uses Google login. Please sign in with Google." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role,
        isPremium: user.isPremium,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

// ─── Google OAuth ─────────────────────────────────────────────────────────────
// POST /auth/google
// The client sends the Google profile info after Google signs in the user
router.post("/google", async (req, res) => {
  try {
    const { name, email, photoURL, googleId } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // find existing user or create new one
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        photoURL: photoURL || "",
        provider: "google",
        // no password for Google users
      });
    } else {
      // update photo if changed
      if (photoURL && user.photoURL !== photoURL) {
        user.photoURL = photoURL;
        await user.save();
      }
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: "Google login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role,
        isPremium: user.isPremium,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(500).json({ message: "Server error during Google login" });
  }
});

// ─── Get current user ─────────────────────────────────────────────────────────
// GET /auth/me  (protected)
// Used on page reload to re-hydrate auth state from stored token
router.get("/me", verifyToken, async (req, res) => {
  try {
    res.status(200).json({
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        photoURL: req.user.photoURL,
        role: req.user.role,
        isPremium: req.user.isPremium,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Update profile ───────────────────────────────────────────────────────────
// PATCH /auth/profile  (protected)
router.patch("/profile", verifyToken, async (req, res) => {
  try {
    const { name, photoURL } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name, photoURL },
      { new: true, select: "-password" }
    );

    res.status(200).json({
      message: "Profile updated",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        photoURL: updatedUser.photoURL,
        role: updatedUser.role,
        isPremium: updatedUser.isPremium,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
