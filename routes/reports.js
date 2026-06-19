import express from "express";
import LessonReport from "../models/LessonReport.js";
import Lesson from "../models/Lesson.js";
import { verifyToken, verifyAdmin } from "../middleware/verifyToken.js";

const router = express.Router();

// ─── Report a lesson ──────────────────────────────────────────────────────────
// POST /reports
router.post("/", verifyToken, async (req, res) => {
  try {
    const { lessonId, reason } = req.body;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    // find the lesson creator's email
    const User = (await import("../models/User.js")).default;
    const creator = await User.findById(lesson.creatorId).select("email");

    await LessonReport.create({
      lessonId,
      reporterUserId: req.user._id,
      reportedUserEmail: creator?.email || "unknown",
      reason,
      lessonTitle: lesson.title,
    });

    res.status(201).json({ message: "Lesson reported successfully" });
  } catch (error) {
    console.error("Report error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Get all reported lessons grouped by lessonId (admin only) ───────────────
// GET /reports
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const reports = await LessonReport.aggregate([
      {
        $group: {
          _id: "$lessonId",
          lessonTitle: { $first: "$lessonTitle" },
          reportCount: { $sum: 1 },
          reports: {
            $push: {
              reason: "$reason",
              reporterUserId: "$reporterUserId",
              reportedUserEmail: "$reportedUserEmail",
              createdAt: "$createdAt",
            },
          },
        },
      },
      { $sort: { reportCount: -1 } },
    ]);

    res.status(200).json({ reports });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Ignore reports for a lesson (admin only) — clears all reports ────────────
// DELETE /reports/ignore/:lessonId
router.delete("/ignore/:lessonId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    await LessonReport.deleteMany({ lessonId: req.params.lessonId });
    res.status(200).json({ message: "Reports cleared" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
