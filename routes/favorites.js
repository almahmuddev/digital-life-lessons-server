
import express from "express";
import Favorite from "../models/Favorite.js";
import Lesson from "../models/Lesson.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Save lesson to favorites 
// post /favorites
router.post("/", verifyToken, async (req, res) => {
  try {
    const { lessonId } = req.body;

    // check if already saved
    const existing = await Favorite.findOne({
      userId: req.user._id,
      lessonId,
    });

    if (existing) {
      return res.status(409).json({ message: "Already saved to favorites" });
    }

    await Favorite.create({ userId: req.user._id, lessonId });

    // increment favoritesCount on the lesson
    await Lesson.findByIdAndUpdate(lessonId, { $inc: { favoritesCount: 1 } });

    res.status(201).json({ message: "Saved to favorites" });
  } catch (error) {
    console.error("Save favorite error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Remove lesson from favorites -----
// delete /favorites/:lessonId
router.delete("/:lessonId", verifyToken, async (req, res) => {
  try {
    const deleted = await Favorite.findOneAndDelete({
      userId: req.user._id,
      lessonId: req.params.lessonId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Favorite not found" });
    }

    // decrement favoritesCount on the lesson
    await Lesson.findByIdAndUpdate(req.params.lessonId, {
      $inc: { favoritesCount: -1 },
    });

    res.status(200).json({ message: "Removed from favorites" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get my favorites -----
// get /favorites/my
router.get("/my", verifyToken, async (req, res) => {
  try {
    const { category, emotionalTone } = req.query;

    const favorites = await Favorite.find({ userId: req.user._id })
      .sort({ savedAt: -1 })
      .populate("lessonId");

    // filter by category if provided
    let lessons = favorites
      .map((f) => f.lessonId)
      .filter(Boolean); // remove null if lesson deleted

    if (category) lessons = lessons.filter((l) => l.category === category);
    if (emotionalTone) lessons = lessons.filter((l) => l.emotionalTone === emotionalTone);

    res.status(200).json({ lessons });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// check if a lesson is saved by current user ---
// get /favorites/check/:lessonId
router.get("/check/:lessonId", verifyToken, async (req, res) => {
  try {
    const fav = await Favorite.findOne({
      userId: req.user._id,
      lessonId: req.params.lessonId,
    });

    res.status(200).json({ isSaved: !!fav });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
