import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.post("/google", async (req, res) => {
  try {
    const { name, email, googleId, photoURL } = req.body;
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({ name, email, googleId, photoURL });
      await user.save();
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
