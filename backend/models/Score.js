const mongoose = require("mongoose");

const ScoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  wpm: {
    type: Number,
    required: true
  },
  accuracy: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  wpmHistory: {
    type: [Number],
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Score", ScoreSchema); 