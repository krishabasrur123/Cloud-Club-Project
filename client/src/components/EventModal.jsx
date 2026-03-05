import { useEffect, useState } from "react";
import "./modal.css";

function toLocalInputValue(d) {
  // convert Date -> yyyy-MM-ddTHH:mm for datetime-local
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function EventModal({ open, draft, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setErr("");
    setLoading(false);
    setTitle("");
    if (draft?.start) setStart(toLocalInputValue(new Date(draft.start)));
    if (draft?.end) setEnd(toLocalInputValue(new Date(draft.end)));
  }, [open, draft]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      if (!title.trim()) throw new Error("Title is required");
      const startISO = new Date(start).toISOString();
      const endISO = new Date(end).toISOString();
      if (new Date(endISO) <= new Date(startISO)) throw new Error("End must be after start");

      await onCreate({ title, start: startISO, end: endISO });
    } catch (e2) {
      setErr(e2.message || "Failed");
      setLoading(false);
    }
  }

  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">Add Calendar Event</div>
          <button className="modalX" onClick={onClose}>✕</button>
        </div>

        <form className="modalForm" onSubmit={submit}>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />

          <label>Start</label>
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />

          <label>End</label>
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />

          {err && <div className="modalErr">{err}</div>}

          <button className="modalBtn" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Create event"}
          </button>
        </form>
      </div>
    </div>
  );
}