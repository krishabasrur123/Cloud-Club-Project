// client/src/lib/scheduledStore.js
// Lightweight localStorage store for scheduled tasks shared between
// Parser → Dashboard → Calendar

const KEY = "nova_scheduled_tasks";

/**
 * Save the full array of scheduled tasks returned by /api/schedule.
 * Each task shape (from server):
 * {
 *   _id, title, type, syllabusDueDate, weightedScore,
 *   bufferDays, totalSessions, assignedDates, sessions, progress
 *   sessions: [{ date: "Month-DD-YYYY", sessionNumber, type, flagged }]
 * }
 */
export function saveScheduledTasks(tasks) {
  localStorage.setItem(KEY, JSON.stringify(tasks));
}

/** Append new tasks to any existing ones (avoids wiping previous parses). */
export function appendScheduledTasks(newTasks) {
  const existing = loadScheduledTasks();
  localStorage.setItem(KEY, JSON.stringify([...existing, ...newTasks]));
}

/** Load all scheduled tasks. Returns [] if nothing stored. */
export function loadScheduledTasks() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Clear everything (e.g. on logout). */
export function clearScheduledTasks() {
  localStorage.removeItem(KEY);
}

/**
 * Expand tasks into a flat list of session blocks — one block per session date.
 * Returns:
 * [{
 *   id: "<taskId>-<sessionNumber>",
 *   taskId, title, type, syllabusDueDate,
 *   sessionDate: Date,          // JS Date for sorting/filtering
 *   sessionDateStr: string,     // "Month-DD-YYYY"
 *   sessionNumber, sessionType, // "study" | "due_date"
 *   flagged,
 *   weightedScore, aiDifficulty, progress,
 * }]
 */
export function expandToSessionBlocks(tasks) {
  const blocks = [];
  for (const task of tasks) {
    const sessions = task.sessions || [];
    for (const s of sessions) {
      blocks.push({
        id:             `${task._id}-${s.sessionNumber}`,
        taskId:         task._id,
        title:          task.title,
        type:           task.type,
        syllabusDueDate: task.syllabusDueDate,
        sessionDate:    parseDisplayDate(s.date),
        sessionDateStr: s.date,
        sessionNumber:  s.sessionNumber,
        sessionType:    s.sessionType,  // field name from server
        flagged:        s.flagged || false,
        weightedScore:  task.weightedScore ?? 0,
        aiDifficulty:   task.aiDifficulty ?? 5,
        progress:       task.progress ?? 0,
      });
    }
  }
  return blocks;
}

/**
 * Parse "Month-DD-YYYY" → JS Date (local midnight).
 * Falls back to "Invalid Date" if unparseable.
 */
export function parseDisplayDate(str) {
  if (!str) return new Date(NaN);
  const months = {
    January:0, February:1, March:2, April:3, May:4, June:5,
    July:6, August:7, September:8, October:9, November:10, December:11,
  };
  const [mon, day, year] = str.split("-");
  if (!mon || !day || !year) return new Date(NaN);
  const m = months[mon];
  if (m === undefined) return new Date(NaN);
  return new Date(Number(year), m, Number(day));
}
