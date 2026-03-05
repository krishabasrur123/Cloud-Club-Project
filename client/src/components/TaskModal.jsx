import { useEffect, useState } from "react";
import "./modal.css";

export default function TaskModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [notes, setNotes] = useState("");

  //  NEW: progress (0–100)
  const [progress, setProgress] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setCourse("");
    setDueDate("");
    setPriority("medium");
    setNotes("");
    setProgress(0);          // reset
    setErr("");
    setLoading(false);
  }, [open]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await onCreate({
        title,
        course: course || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        priority,
        notes: notes || undefined,
        progress, // include
      });
      // you can optionally close after create:
      // onClose();
    } catch (e2) {
      setErr(e2.message || "Failed");
      setLoading(false);
    }
  }

  const progressLabel = `${progress}%`;

  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">Add Task</div>
          <button className="modalX" onClick={onClose}>✕</button>
        </div>

        <form className="modalForm" onSubmit={submit}>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />

          <label>Course (optional)</label>
          <input value={course} onChange={(e) => setCourse(e.target.value)} />

          <label>Due date (optional)</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <label>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>

          {/* NEW: Progress question + dot bar */}
          <label>Progress</label>
          <div className="progressRow">
            <div className="progressDots" aria-label={`Progress ${progressLabel}`}>
              {Array.from({ length: 10 }).map((_, i) => {
                const filled = progress >= (i + 1) * 10;
                return <span key={i} className={`dot ${filled ? "filled" : ""}`} />;
              })}
            </div>

            <div className="progressPct">{progressLabel}</div>
          </div>

          <input
            className="progressRange"
            type="range"
            min="0"
            max="100"
            step="10"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
          />

          <label>Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />

          {err && <div className="modalErr">{err}</div>}

          <button className="modalBtn" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Create task"}
          </button>
        </form>
      </div>
    </div>
  );
}