
import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Personal Growth",
        "Career",
        "Relationships",
        "Mindset",
        "Mistakes Learned",
      ],
    },
    emotionalTone: {
      type: String,
      required: true,
      enum: ["Motivational", "Sad", "Realization", "Gratitude"],
    },
    imageURL: {
      type: String,
      default: "",
    },
    visibility: {
      type: String,
      enum: ["Public", "Private"],
      default: "Public",
    },
    accessLevel: {
      type: String,
      enum: ["Free", "Premium"],
      default: "Free",
    },
    // stores userIds who liked this lesson
    likes: {
      type: [String],
      default: [],
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    // favoritesCount update when user saves/removes this lesson
    favoritesCount: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isReviewed: {
      type: Boolean,
      default: false,
    },
    // creator info
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    creatorName: {
      type: String,
      required: true,
    },
    creatorPhoto: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// text index for search by title/keyword
lessonSchema.index({ title: "text", description: "text" });

const Lesson = mongoose.model("Lesson", lessonSchema);
export default Lesson;
