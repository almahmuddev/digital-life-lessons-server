
import mongoose from "mongoose";

const lessonReportSchema = new mongoose.Schema(
  {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    reporterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUserEmail: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      enum: [
        "Inappropriate content",
        "Spam or misleading",
        "Hate speech",
        "Harassment",
        "False information",
        "Other",
      ],
    },
    lessonTitle: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const LessonReport = mongoose.model("LessonReport", lessonReportSchema);
export default LessonReport;
