
import express from "express";
import User from "../models/User.js";
import Lesson from "../models/Lesson.js";
import LessonReport from "../models/LessonReport.js";
import { verifyToken, verifyAdmin } from "../middleware/verifyToken.js";

const router = express.Router();

// all admin routes require verifytoken + verifyadmin
router.use(verifyToken, verifyAdmin);


// get /admin/stats
router.get("/stats", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalLessons,
      totalPublicLessons,
      totalPrivateLessons,
      totalReportedLessons,
      todayLessons,
      premiumUsers,
    ] = await Promise.all([
      User.countDocuments(),
      Lesson.countDocuments(),
      Lesson.countDocuments({ visibility: "Public" }),
      Lesson.countDocuments({ visibility: "Private" }),
      LessonReport.distinct("lessonId").then((ids) => ids.length),
      Lesson.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ isPremium: true }),
    ]);

    // lesson growth — last 7 days
    const lessonGrowth = await Lesson.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      totalUsers,
      totalLessons,
      totalPublicLessons,
      totalPrivateLessons,
      totalReportedLessons,
      todayLessons,
      premiumUsers,
      lessonGrowth,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users ---
// get /admin/users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    // add lesson count for each user
    const usersWithCount = await Promise.all(
      users.map(async (u) => {
        const lessonCount = await Lesson.countDocuments({ creatorId: u._id });
        return { ...u.toObject(), lessonCount };
      })
    );

    res.status(200).json({ users: usersWithCount });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

//  Update user role ---
// patch /admin/users/:userId/role
router.patch("/users/:userId/role", async (req, res) => {
  try {
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true, select: "-password" }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Role updated", user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// delete user ----
// delete /admin/users/:userId
router.delete("/users/:userId", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.userId);
    await Lesson.deleteMany({ creatorId: req.params.userId });
    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// admin see ( all lesson ) ----
// get /admin/lessons
router.get("/lessons", async (req, res) => {
  try {
    const { category, visibility, flagged } = req.query;
    const query = {};

    if (category) query.category = category;
    if (visibility) query.visibility = visibility;

    const lessons = await Lesson.find(query).sort({ createdAt: -1 });

    if (flagged === "true") {
      const reportedIds = await LessonReport.distinct("lessonId");
      const flaggedLessons = lessons.filter((l) =>
        reportedIds.map((id) => id.toString()).includes(l._id.toString())
      );
      return res.status(200).json({ lessons: flaggedLessons });
    }

    res.status(200).json({ lessons });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Toggle featured on a lesson ----
// patch /admin/lessons/:id/feature
router.patch("/lessons/:id/feature", async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    lesson.isFeatured = !lesson.isFeatured;
    await lesson.save();

    res.status(200).json({
      message: `Lesson ${lesson.isFeatured ? "featured" : "unfeatured"}`,
      isFeatured: lesson.isFeatured,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Mark lesson as reviewed ----
// patch /admin/lessons/:id/review
router.patch("/lessons/:id/review", async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      { isReviewed: true },
      { new: true }
    );
    res.status(200).json({ message: "Lesson marked as reviewed", lesson });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// admin Delete lesson ----
// delete /admin/lessons/:id
router.delete("/lessons/:id", async (req, res) => {
  try {
    await Lesson.findByIdAndDelete(req.params.id);
    await LessonReport.deleteMany({ lessonId: req.params.id });
    res.status(200).json({ message: "Lesson deleted by admin" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
