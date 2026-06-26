const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  date:          { type: String, required: true }, // "Month-DD-YYYY"
  sessionNumber: { type: Number },
  sessionType:   { type: String, enum: ["study", "due_date"], default: "study" },
  flagged:       { type: Boolean, default: false }, // true = capacity conflict
}, { _id: false });

const scheduledTaskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // From syllabus extraction
    title:          { type: String, required: true },
    type:           { type: String },           // "Homework", "Midterm", etc.
    syllabusDueDate:{ type: String },           // raw YYYY-MM-DD from extractor

    // Scoring inputs
    aiDifficulty:            { type: Number },  // 1–10
    aiEstimatedTime:         { type: Number },  // hours
    studentConfidence:       { type: Number },  // 1–5 raw
    studentDifficulty:       { type: Number },  // 1–5 raw
    questionCorrectnessScore:{ type: Number },  // 0–1
    weightedScore:           { type: Number },  // 0–1 final

    // Scheduling output
    bufferDays:    { type: Number },
    sessions:      [sessionSchema],             // full session list with types
    assignedDates: [{ type: String }],          // flat list of "Month-DD-YYYY" strings

    // Progress tracking: 0–100
    progress: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ScheduledTask", scheduledTaskSchema);
