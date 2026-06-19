import express from "express";
import Lesson from "../models/Lesson.js";
import User from "../models/User.js";
import Favorite from "../models/Favorite.js";
import { verifyToken, verifyAdmin } from "../middleware/verifyToken.js";

const router = express.Router();

// ─── Create lesson ────────────────────────────────────────────────────────────
// POST /lessons
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, description, category, emotionalTone, imageURL, visibility, accessLevel } = req.body;

    // Free users cannot create Premium lessons — enforce server-side
    const resolvedAccessLevel =
      req.user.isPremium ? (accessLevel || "Free") : "Free";

    const lesson = await Lesson.create({
      title,
      description,
      category,
      emotionalTone,
      imageURL: imageURL || "",
      visibility: visibility || "Public",
      accessLevel: resolvedAccessLevel,
      creatorId: req.user._id,
      creatorName: req.user.name,
      creatorPhoto: req.user.photoURL || "",
    });

    res.status(201).json({ message: "Lesson created successfully", lesson });
  } catch (error) {
    console.error("Create lesson error:", error);
    res.status(500).json({ message: "Server error creating lesson" });
  }
});

// ─── Get all PUBLIC lessons (with filter/sort/search/pagination) ───────────────
// GET /lessons/public
// Challenge 1: filter by category, emotionalTone; sort; search by keyword
// Challenge 3: pagination
router.get("/public", async (req, res) => {
  try {
    const {
      category,
      emotionalTone,
      sort = "newest",
      search,
      page = 1,
      limit = 9,
    } = req.query;

    const query = { visibility: "Public" };

    if (category) query.category = category;
    if (emotionalTone) query.emotionalTone = emotionalTone;
    if (search) query.$text = { $search: search };

    let sortOption = {};
    if (sort === "newest") sortOption = { createdAt: -1 };
    else if (sort === "oldest") sortOption = { createdAt: 1 };
    else if (sort === "most-saved") sortOption = { favoritesCount: -1 };
    else if (sort === "most-liked") sortOption = { likesCount: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Lesson.countDocuments(query);
    const lessons = await Lesson.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      lessons,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("Get public lessons error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Get featured lessons (for home page) ─────────────────────────────────────
// GET /lessons/featured
router.get("/featured", async (req, res) => {
  try {
    const lessons = await Lesson.find({
      isFeatured: true,
      visibility: "Public",
    })
      .sort({ createdAt: -1 })
      .limit(6);

    res.status(200).json({ lessons });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Get most saved lessons (home page dynamic section) ───────────────────────
// GET /lessons/most-saved
router.get("/most-saved", async (req, res) => {
  try {
    const lessons = await Lesson.find({ visibility: "Public" })
      .sort({ favoritesCount: -1 })
      .limit(6);

    res.status(200).json({ lessons });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Top contributors of the week (home page dynamic section) ─────────────────
// GET /lessons/top-contributors
router.get("/top-contributors", async (req, res) => {
  try {
    // lessons created in the last 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const contributors = await Lesson.aggregate([
      {
        $match: {
          createdAt: { $gte: oneWeekAgo },
          visibility: "Public",
        },
      },
      {
        $group: {
          _id: "$creatorId",
          lessonCount: { $sum: 1 },
          creatorName: { $first: "$creatorName" },
          creatorPhoto: { $first: "$creatorPhoto" },
        },
      },
      { $sort: { lessonCount: -1 } },
      { $limit: 6 },
    ]);

    res.status(200).json({ contributors });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Get lessons by a specific creator (for author profile) ───────────────────
// GET /lessons/by-creator/:creatorId
router.get("/by-creator/:creatorId", async (req, res) => {
  try {
    const lessons = await Lesson.find({
      creatorId: req.params.creatorId,
      visibility: "Public",
    }).sort({ createdAt: -1 });

    res.status(200).json({ lessons });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Get MY lessons (private route) ───────────────────────────────────────────
// GET /lessons/my
router.get("/my", verifyToken, async (req, res) => {
  try {
    const lessons = await Lesson.find({ creatorId: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ lessons });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Get single lesson by ID ──────────────────────────────────────────────────
// GET /lessons/:id
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    // Premium lesson guard: only premium users or the creator can see it
    const isOwner = lesson.creatorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (lesson.accessLevel === "Premium" && !req.user.isPremium && !isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Premium lesson — upgrade to access",
        isPremiumRequired: true,
      });
    }

    res.status(200).json({ lesson });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Update lesson ────────────────────────────────────────────────────────────
// PATCH /lessons/:id
router.patch("/:id", verifyToken, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const isOwner = lesson.creatorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this lesson" });
    }

    // Free users cannot switch access level to Premium
    if (req.body.accessLevel === "Premium" && !req.user.isPremium) {
      req.body.accessLevel = "Free";
    }

    const updated = await Lesson.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    );

    res.status(200).json({ message: "Lesson updated", lesson: updated });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Delete lesson ────────────────────────────────────────────────────────────
// DELETE /lessons/:id
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const isOwner = lesson.creatorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this lesson" });
    }

    await Lesson.findByIdAndDelete(req.params.id);
    // also clean up favorites
    await Favorite.deleteMany({ lessonId: req.params.id });

    res.status(200).json({ message: "Lesson deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Toggle like ──────────────────────────────────────────────────────────────
// PATCH /lessons/:id/like
router.patch("/:id/like", verifyToken, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const userId = req.user._id.toString();
    const alreadyLiked = lesson.likes.includes(userId);

    if (alreadyLiked) {
      // unlike
      lesson.likes = lesson.likes.filter((id) => id !== userId);
      lesson.likesCount = Math.max(0, lesson.likesCount - 1);
    } else {
      // like
      lesson.likes.push(userId);
      lesson.likesCount += 1;
    }

    await lesson.save();

    res.status(200).json({
      liked: !alreadyLiked,
      likesCount: lesson.likesCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── Toggle visibility (Public / Private) ────────────────────────────────────
// PATCH /lessons/:id/visibility
router.patch("/:id/visibility", verifyToken, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const isOwner = lesson.creatorId.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    lesson.visibility = lesson.visibility === "Public" ? "Private" : "Public";
    await lesson.save();

    res.status(200).json({ visibility: lesson.visibility });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
