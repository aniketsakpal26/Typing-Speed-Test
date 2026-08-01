const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Score = require("../models/Score");
const User = require("../models/User");

// Save typing test score
router.post("/score", auth, async (req, res) => {
  try {
    const { wpm, accuracy, duration, text, wpmHistory } = req.body;

    // Create new score
    const score = new Score({
      user: req.user.id,
      wpm,
      accuracy,
      duration,
      text,
      wpmHistory
    });

    await score.save();

    // Update user stats
    const user = await User.findById(req.user.id);
    
    // Calculate new average WPM
    const scores = await Score.find({ user: req.user.id });
    const totalWPM = scores.reduce((sum, score) => sum + score.wpm, 0);
    const averageWPM = Math.round(totalWPM / scores.length);

    user.stats = {
      highestWPM: Math.max(user.stats.highestWPM || 0, wpm),
      averageWPM: averageWPM,
      testsCompleted: scores.length,
      totalTimePlayed: (user.stats.totalTimePlayed || 0) + duration,
      bestAccuracy: Math.max(user.stats.bestAccuracy || 0, accuracy)
    };

    await user.save();

    res.json({ 
      message: "Score saved successfully",
      stats: user.stats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/submit-score", auth, async (req, res) => {
    try {
        const { wpm, accuracy } = req.body;
        const userId = req.user.id;

        // Update user stats
        const user = await User.findById(userId);
        
        // Update highest WPM if current WPM is higher
        if (wpm > user.stats.highestWPM) {
            user.stats.highestWPM = wpm;
        }

        // Update best accuracy if current accuracy is higher
        if (accuracy > user.stats.bestAccuracy) {
            user.stats.bestAccuracy = accuracy;
        }

        // Update tests completed
        user.stats.testsCompleted += 1;

        // Update average WPM
        const oldTotal = user.stats.averageWPM * (user.stats.testsCompleted - 1);
        user.stats.averageWPM = (oldTotal + wpm) / user.stats.testsCompleted;

        await user.save();

        // Create new score record
        const score = new Score({
            user: userId,
            wpm,
            accuracy
        });

        await score.save();

        res.json({
            message: "Score submitted successfully",
            stats: user.stats
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Get user stats
router.get("/stats", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user.stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get user's recent scores
router.get("/history", auth, async (req, res) => {
  try {
    const scores = await Score.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(scores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    // Get top 10 users by WPM
    const topByWPM = await User.find({
      "stats.highestWPM": { $gt: 0 }
    })
    .select("username stats.highestWPM stats.bestAccuracy stats.testsCompleted")
    .sort({ "stats.highestWPM": -1 })
    .limit(10);

    // Get top 10 users by accuracy
    const topByAccuracy = await User.find({
      "stats.bestAccuracy": { $gt: 0 }
    })
    .select("username stats.highestWPM stats.bestAccuracy stats.testsCompleted")
    .sort({ "stats.bestAccuracy": -1 })
    .limit(10);

    res.json({
      wpm: topByWPM,
      accuracy: topByAccuracy
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router; 