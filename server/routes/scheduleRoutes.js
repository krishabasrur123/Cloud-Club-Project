const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const ScheduledTask = require("../models/ScheduledTask");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_BUFFER_DAYS = 20;   // maximum lead-time window (configurable)
const MAX_DAILY_HOURS = 5;    // capacity constraint: max study hours per day

// ---------------------------------------------------------------------------
// Step 1 helpers — score derivation from student answers
// ---------------------------------------------------------------------------

/** confidence answer → raw 1–5 value (low confidence = high number = more urgency) */
function confidenceToRaw(answer) {
  const map = {
    "Very confident":      1,
    "Somewhat confident":  2,
    "Neutral":             3,
    "Not very confident":  4,
    "Unsure":              5,
  };
  return map[answer] ?? 3;
}

/** time-estimation answer → raw 1–5 value (more time needed = high number) */
function timeEstimationToRaw(answer) {
  const map = {
    "I have mastered it":              1,
    "Need a quick review":             2,
    "Need enough time for homework":   3,
    "Need significant study time":     4,
  };
  return map[answer] ?? 3;
}

// ---------------------------------------------------------------------------
// Step 1 — Weighted score formula
//
//   Score = (D×0.20) + (T×0.10) + (C×0.25) + (S×0.25) + (I×0.20)
//
//   D = AI difficulty (1-10)  → normalized (d-1)/9
//   T = AI est. time (hrs)    → capped 20hrs, normalized t/20
//   C = Student confidence    → inverted: (6 - raw) / 5
//   S = Student difficulty    → normalized (s-1)/4
//   I = Incorrectness         → 1 - correctness fraction
// ---------------------------------------------------------------------------
function computeWeightedScore({ aiDifficulty, aiEstimatedTime, studentConfidenceRaw,
                                 studentDifficultyRaw, questionCorrectnessScore }) {
  const D = (Math.min(Math.max(aiDifficulty, 1), 10) - 1) / 9;
  const T = Math.min(aiEstimatedTime, 20) / 20;
  const C = (6 - Math.min(Math.max(studentConfidenceRaw, 1), 5)) / 5;
  const S = (Math.min(Math.max(studentDifficultyRaw, 1), 5) - 1) / 4;
  const I = 1 - Math.min(Math.max(questionCorrectnessScore, 0), 1);

  return (D * 0.20) + (T * 0.10) + (C * 0.25) + (S * 0.25) + (I * 0.20);
}

// ---------------------------------------------------------------------------
// Date utilities
// ---------------------------------------------------------------------------

/** Parse YYYY-MM-DD into a local midnight Date (no UTC shift). */
function parseYMD(str) {
  if (!str) return null;
  const parts = str.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/** Format a Date to "Month-DD-YYYY" */
function formatDate(date) {
  const months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  return `${months[date.getMonth()]}-${String(date.getDate()).padStart(2,"0")}-${date.getFullYear()}`;
}

/** Format a Date to "YYYY-MM-DD" (for internal sorting / capacity map keys) */
function toYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

/** Add N calendar days to a Date, returns a new Date */
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ---------------------------------------------------------------------------
// Classify task type
// ---------------------------------------------------------------------------
function isExamType(type = "") {
  return /exam|final|midterm|quiz|test/i.test(type);
}

function isHomeworkType(type = "") {
  return /homework|assignment|project|hw|lab|report/i.test(type);
}

/**
 * Exam bias: boost weighted score by up to +0.20 for exam-type tasks,
 * scaled by the base score (harder exams get a larger absolute boost).
 * Clamped so final score never exceeds 1.0.
 */
function applyExamBias(score, type = "") {
  if (!isExamType(type)) return score;
  const EXAM_BIAS = 0.20;
  return Math.min(1.0, score + EXAM_BIAS * (0.5 + score * 0.5));
}

// ---------------------------------------------------------------------------
// Step 2–4 — Core scheduling algorithm
//
// Returns array of { date: Date, sessionNumber: number, type: "study"|"due_date" }
// ---------------------------------------------------------------------------
function scheduleSessions({ score, dueDate, today, aiEstimatedTime, taskType }) {
  // -- Step 2: buffer days --
  const bufferDays = Math.round(score * MAX_BUFFER_DAYS);
  const earliestStart = addDays(dueDate, -bufferDays);

  // Clamp: can't start before today
  const startDate = earliestStart < today ? today : earliestStart;

  // Available range in days
  const rangeMs = dueDate - startDate;
  const rangeDays = Math.max(0, Math.floor(rangeMs / 86400000));

  // -- Step 3: number of sessions --
  const baseSessions = 1 + Math.round(score * 10);        // 1–11
  const timeBasedSessions = Math.ceil((aiEstimatedTime || 2) / 2); // each session ~2hrs
  const totalSessions = Math.max(baseSessions, timeBasedSessions);

  // -- Step 5: task-type distinction --
  // Homework/assignment with low score → just the due date
  if (isHomeworkType(taskType) && score < 0.35) {
    return [{ date: new Date(dueDate), sessionNumber: 1, sessionType: "due_date" }];
  }

  // If no room (due date is today or in the past), just return due date
  if (rangeDays === 0) {
    return [{ date: new Date(dueDate), sessionNumber: 1, sessionType: "due_date" }];
  }

  // Cap sessions to available days
  const actualSessions = Math.min(totalSessions, rangeDays + 1);

  if (actualSessions === 1) {
    return [{ date: new Date(dueDate), sessionNumber: 1, sessionType: "due_date" }];
  }

  // -- Step 4: exponential spacing --
  // We place session 1 at startDate and the last session at dueDate.
  // Intermediate sessions use exponential interpolation so sessions cluster
  // closer to the due date (spaced-repetition effect).
  const sessions = [];
  for (let i = 0; i < actualSessions; i++) {
    let date;
    if (i === 0) {
      date = new Date(startDate);
    } else if (i === actualSessions - 1) {
      date = new Date(dueDate);
    } else {
      // Exponential interpolation: t goes 0→1, exponent > 1 bunches toward end
      const t = i / (actualSessions - 1);
      const tExp = Math.pow(t, 0.7); // exponent < 1 → more sessions near the end
      const dayOffset = Math.round(tExp * rangeDays);
      date = addDays(startDate, dayOffset);
    }

    const sessionType = i === actualSessions - 1 ? "due_date" : "study";
    sessions.push({ date, sessionNumber: i + 1, sessionType });
  }

  // Deduplicate dates that landed on the same day
  const seen = new Set();
  return sessions.filter(s => {
    const key = toYMD(s.date);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Step 7 — Capacity constraint resolution
//
// dailyLoad map: { "YYYY-MM-DD": totalHoursScheduled }
// If a day exceeds MAX_DAILY_HOURS, move lower-priority tasks forward/backward.
// ---------------------------------------------------------------------------
function resolveCapacity(allTaskSchedules) {
  // Build a daily load map and detect conflicts
  const dailyLoad = {}; // { "YYYY-MM-DD": [ { taskIdx, sessionIdx, hours, score } ] }

  allTaskSchedules.forEach((task, taskIdx) => {
    const hoursPerSession = task.aiEstimatedTime / task.sessions.length;
    task.sessions.forEach((s, sessionIdx) => {
      const key = toYMD(s.date);
      if (!dailyLoad[key]) dailyLoad[key] = [];
      dailyLoad[key].push({ taskIdx, sessionIdx, hours: hoursPerSession, score: task.score });
    });
  });

  // For each overloaded day, move lower-priority sessions ±1 day
  for (const [dayKey, entries] of Object.entries(dailyLoad)) {
    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
    if (totalHours <= MAX_DAILY_HOURS) continue;

    // Sort ascending by score — lowest priority gets moved first
    entries.sort((a, b) => a.score - b.score);

    let remaining = totalHours;
    for (const entry of entries) {
      if (remaining <= MAX_DAILY_HOURS) break;

      const task = allTaskSchedules[entry.taskIdx];
      const session = task.sessions[entry.sessionIdx];

      // Don't move the due_date session
      if (session.sessionType === "due_date") continue;

      // Try moving 1 day earlier, then 1 day later
      const candidate = addDays(session.date, -1);
      const candidateKey = toYMD(candidate);
      const candidateLoad = (dailyLoad[candidateKey] || []).reduce((s, e) => s + e.hours, 0);

      if (candidate >= task.today && candidateLoad + entry.hours <= MAX_DAILY_HOURS) {
        session.date = candidate;
        session.flagged = false;
      } else {
        // Flag as conflict recommendation
        session.flagged = true;
      }

      remaining -= entry.hours;
    }
  }

  return allTaskSchedules;
}

// ---------------------------------------------------------------------------
// DELETE /api/schedule — wipe all tasks for the current user (dev/reset helper)
// ---------------------------------------------------------------------------
router.delete("/", protect, async (req, res) => {
  try {
    const result = await ScheduledTask.deleteMany({ user: req.user._id });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/schedule — fetch all scheduled tasks for the logged-in user
// ---------------------------------------------------------------------------
router.get("/", protect, async (req, res) => {
  try {
    const tasks = await ScheduledTask.find({ user: req.user._id }).sort({ createdAt: -1 });

    // Shape matches what the client expects from the POST response
    const result = tasks.map(t => ({
      _id:              t._id,
      title:            t.title,
      type:             t.type,
      syllabusDueDate:  t.syllabusDueDate,
      weightedScore:    t.weightedScore,
      bufferDays:       t.bufferDays,
      totalSessions:    t.sessions?.length ?? 0,
      assignedDates:    t.assignedDates,
      sessions:         t.sessions,
      aiDifficulty:     t.aiDifficulty,
      progress:         t.progress,
    }));

    res.json({ scheduled: result });
  } catch (err) {
    console.error("[schedule GET] error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/schedule
// ---------------------------------------------------------------------------
router.post("/", protect, async (req, res) => {
  console.log("[schedule] tasks:", req.body.tasks?.length,
              "| questions:", req.body.questions?.length,
              "| answers:", Object.keys(req.body.answers || {}).length);

  const { tasks, answers, questions, todayDate } = req.body;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: "No tasks provided" });
  }

  try {
    // ── Derive student scores from question answers ──────────────────────
    let studentConfidenceRaw = 3;
    let studentDifficultyRaw = 3;
    let correctCount = 0;
    let mcqTotal = 0;

    if (questions && answers) {
      questions.forEach((q, idx) => {
        const given = answers[String(idx)];
        if (!given) return;
        if (q.type === "confidence")      studentConfidenceRaw = confidenceToRaw(given);
        else if (q.type === "time_estimation") studentDifficultyRaw = timeEstimationToRaw(given);
        else if (q.type === "mcq") {
          mcqTotal++;
          if (q.answer && q.answer !== "NONE" && given === q.answer) correctCount++;
        }
      });
    }

    const questionCorrectnessScore = mcqTotal > 0 ? correctCount / mcqTotal : 0.5;
    const todayStr = todayDate ? todayDate.slice(0, 10) : new Date().toLocaleDateString("en-CA");
    const today = parseYMD(todayStr) || new Date();

    // ── Build per-task schedule data (without saving yet) ─────────────────
    const allTaskSchedules = tasks.map((t, i) => {
      const rawScore = computeWeightedScore({
        aiDifficulty:            t.AI_estimateDifficulty ?? 5,
        aiEstimatedTime:         t.AI_estimateTime ?? 5,
        studentConfidenceRaw,
        studentDifficultyRaw,
        questionCorrectnessScore,
      });
      const score = applyExamBias(rawScore, t.type || "");

      const dueDate = parseYMD(t.date) || addDays(today, 14); // fallback 2 weeks

      const sessions = scheduleSessions({
        score,
        dueDate,
        today,
        aiEstimatedTime: t.AI_estimateTime ?? 5,
        taskType: t.type || "",
      });

      return {
        index: i,
        task: t,
        score: Math.round(score * 100) / 100,
        dueDate,
        today,
        aiEstimatedTime: t.AI_estimateTime ?? 5,
        sessions,
      };
    });

    // ── Step 7: resolve capacity conflicts ────────────────────────────────
    resolveCapacity(allTaskSchedules);

    // ── Save to DB and build response ─────────────────────────────────────
    const savedTasks = [];

    for (const item of allTaskSchedules) {
      const t = item.task;
      const assignedDates = item.sessions.map(s => formatDate(s.date));
      const syllabusDueFormatted = item.dueDate ? formatDate(item.dueDate) : (t.date || "No date");

      // ── Console log ──────────────────────────────────────────────────────
      const bufferDays = Math.round(item.score * MAX_BUFFER_DAYS);
      const sessionLines = item.sessions.map(
        s => `  [${String(s.sessionNumber).padStart(2)}] ${formatDate(s.date)}  (${s.sessionType}${s.flagged ? " ⚠ conflict" : ""})`
      ).join("\n");

      console.log(`\n${"─".repeat(52)}`);
      console.log(`Task:           ${t.description || t.type}`);
      console.log(`Type:           ${t.type}`);
      console.log(`Syllabus Due:   ${syllabusDueFormatted}`);
      console.log(`Weighted Score: ${Math.round(item.score * 100)}%`);
      console.log(`Buffer Days:    ${bufferDays}`);
      console.log(`Sessions:       ${item.sessions.length}`);
      console.log(`Schedule:\n${sessionLines}`);
      console.log("─".repeat(52));

      const scheduled = new ScheduledTask({
        user:                   req.user._id,
        title:                  t.description || t.type || "Untitled Task",
        type:                   t.type,
        syllabusDueDate:        t.date,
        aiDifficulty:           t.AI_estimateDifficulty ?? 5,
        aiEstimatedTime:        t.AI_estimateTime ?? 5,
        studentConfidence:      studentConfidenceRaw,
        studentDifficulty:      studentDifficultyRaw,
        questionCorrectnessScore,
        weightedScore:          item.score,
        bufferDays:             Math.round(item.score * MAX_BUFFER_DAYS),
        // Save sessions using the schema field name "sessionType"
        sessions: item.sessions.map(s => ({
          date:          formatDate(s.date),
          sessionNumber: s.sessionNumber,
          sessionType:   s.sessionType,
          flagged:       s.flagged || false,
        })),
        assignedDates,
        progress:               0,
      });

      const saved = await scheduled.save();

      savedTasks.push({
        _id:              saved._id,
        title:            saved.title,
        type:             saved.type,
        syllabusDueDate:  syllabusDueFormatted,
        weightedScore:    saved.weightedScore,
        bufferDays,
        totalSessions:    item.sessions.length,
        assignedDates:    saved.assignedDates,
        sessions:         item.sessions.map(s => ({
          date:          formatDate(s.date),
          sessionNumber: s.sessionNumber,
          sessionType:   s.sessionType,   // consistent field name
          flagged:       s.flagged || false,
        })),
        progress:         saved.progress,
      });
    }

    res.status(201).json({ scheduled: savedTasks });

  } catch (err) {
    console.error("[schedule] error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
