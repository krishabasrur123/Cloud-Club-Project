import "./parser.css";
import { useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Parser() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [userConfidence, setUserConfidence] = useState(3);
  const [userEstimatedTime, setUserEstimatedTime] = useState(60);
  const [aiDifficulty, setAiDifficulty] = useState(3);

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function onCreate(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      await api.createTask({
        title,
        description,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        userConfidence: Number(userConfidence),
        userEstimatedTime: Number(userEstimatedTime),
        aiDifficulty: Number(aiDifficulty),
      });
      navigate("/dashboard");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <h2>Add a Task</h2>

      <form onSubmit={onCreate} style={{ display: "grid", gap: 12 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={4}
        />
        <label>
          Due date:
          <input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" />
        </label>

        <label>
          Your confidence (1–5):
          <input
            type="number"
            min="1"
            max="5"
            value={userConfidence}
            onChange={(e) => setUserConfidence(e.target.value)}
          />
        </label>

        <label>
          Estimated time (minutes):
          <input
            type="number"
            min="0"
            value={userEstimatedTime}
            onChange={(e) => setUserEstimatedTime(e.target.value)}
          />
        </label>

        <label>
          AI difficulty (1–5):
          <input type="number" min="1" max="5" value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)} />
        </label>

        {err && <div style={{ color: "crimson" }}>{err}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => navigate("/dashboard")}>
            Cancel
          </button>
          <button disabled={saving} type="submit">
            {saving ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}