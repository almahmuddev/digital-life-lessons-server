import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";

// models
import User from "./models/User.js";

// routes
import authRoutes from "./routes/auth.js";
import lessonRoutes from "./routes/lessons.js";
import favoriteRoutes from "./routes/favorites.js";
import commentRoutes from "./routes/comments.js";
import reportRoutes from "./routes/reports.js";
import adminRoutes from "./routes/admin.js";
import paymentRoutes from "./routes/payments.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;


// app.use(
//   cors({
//     origin: [
//       process.env.CLIENT_URL || "http://localhost:3000",
//       "http://localhost:3000",
//     ],
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );


app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://digital-life-lessons-client-beta.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);



const stripeWebhook = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post(
  "/payments/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripeWebhook.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.userId;

      if (userId) {
        try {
          await User.findByIdAndUpdate(userId, {
            isPremium: true,
            stripeCustomerId: session.customer || "",
          });
          console.log(`✅ User ${userId} upgraded to Premium`);
        } catch (err) {
          console.error("Failed to upgrade user after payment:", err);
        }
      }
    }

    res.status(200).json({ received: true });
  }
);

//  Body parsers ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -- MongoDB connection ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

// Routes --
app.use("/auth", authRoutes);
app.use("/lessons", lessonRoutes);
app.use("/favorites", favoriteRoutes);
app.use("/comments", commentRoutes);
app.use("/reports", reportRoutes);
app.use("/admin", adminRoutes);
app.use("/payments", paymentRoutes);

// Render to keep the server alive -----
app.get("/", (req, res) => {
  res.json({ message: "Digital Life Lessons API is running ✅" });
});

// 404 handler ---
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

//  global error handler ---
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// server start-----
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
