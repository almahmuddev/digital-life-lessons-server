
import express from "express";
import Stripe from "stripe";
import User from "../models/User.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// -- Stripe Checkout Session 
router.post("/create-checkout-session", verifyToken, async (req, res) => {
  try {
    if (req.user.isPremium) {
      return res.status(400).json({ message: "You are already a Premium member" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: process.env.STRIPE_CURRENCY || "bdt",
            product_data: {
              name: "LifeLessons Premium — Lifetime Access",
              description: "Unlock premium lessons, create exclusive content, and more.",
            },
            unit_amount: Number(process.env.STRIPE_PRICE_AMOUNT) || 150000, // ৳1500
          },
          quantity: 1,
        },
      ],
      // pass userId so the webhook knows who to upgrade
      metadata: {
        userId: req.user._id.toString(),
      },
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    res.status(500).json({ message: "Failed to create checkout session" });
  }
});

//  stripe webhook ----


router.get("/verify-session/:sessionId", verifyToken, async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);

    res.status(200).json({
      paid: session.payment_status === "paid",
      session,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to verify session" });
  }
});

export default router;
