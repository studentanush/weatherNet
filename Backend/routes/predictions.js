import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.post("/:userId", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.predictions.push({ latitude, longitude });
    await user.save();
    res.json(user.predictions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("predictions");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.predictions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
