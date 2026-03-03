const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const protect = require("../middleware/authMiddleware");

// POST /api/tasks  (Create task)
router.post("/", protect, async (req, res) => {
  try {
    const {
      title,
      description,
      dueDate,
      userConfidence,
      userEstimatedTime,
      aiDifficulty
    } = req.body;

    const task = new Task({
      user: req.user._id,
      title,
      description,
      dueDate,
      userConfidence,
      userEstimatedTime,
      aiDifficulty,
      strengthScore: 0 // placeholder for now
    });

    const createdTask = await task.save();
    res.status(201).json(createdTask);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks  (Get all tasks for logged in user)
router.get("/", protect, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user._id });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;