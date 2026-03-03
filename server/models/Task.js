const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    title: {
      type: String,
      required: true
    },

    description: {
      type: String
    },

    dueDate: {
      type: Date,
      required: true
    },

    userConfidence: {
      type: Number, // 1–10 scale
      required: true
    },

    userEstimatedTime: {
      type: Number, // minutes
      required: true
    },

    aiDifficulty: {
      type: Number // 1–10 scale (later from Nova)
    },

    strengthScore: {
      type: Number
    },

    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);

