import express from "express";
import Comment from "../models/Comment.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// ─── Post a comment ───────────────────────────────────────────────────────────
// POST /comments
router.post("/", verifyToken, async (req, res) => {
  try {
    const { lessonId, text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const comment = await Comment.create({
      lessonId,
      userId: req.user._id,
      userName: req.user.name,
      userPhoto: req.user.photoURL || "",
      text: text.trim(),
    });

    res.status(201).json({ message: "Comment posted", comment });
  } catch (error) {
    console.error("Comment error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Get comments for a lesson ────────────────────────────────────────────────
// GET /comments/:lessonId
router.get("/:lessonId", async (req, res) => {
  try {
    const comments = await Comment.find({ lessonId: req.params.lessonId }).sort({
      createdAt: -1,
    });

    res.status(200).json({ comments });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Delete a comment (owner or admin) ───────────────────────────────────────
// DELETE /comments/:commentId
router.delete("/:commentId", verifyToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const isOwner = comment.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Comment.findByIdAndDelete(req.params.commentId);
    res.status(200).json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
