import "./dashboard.css";
import { useEffect, useState } from "react";
import { api, getUser, clearSession } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getUser();

  const [tasks, setTasks] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function logout() {
    clearSession();
    navigate("/auth");
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Dashboard</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span>{user?.email}</span>
          <button onClick={() => navigate("/parser")}>Add Tasks</button>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      {err && <div style={{ color: "crimson", marginTop: 12 }}>{err}</div>}
      {loading ? (
        <div style={{ marginTop: 12 }}>Loading…</div>
      ) : (
        <ul style={{ marginTop: 12 }}>
          {tasks.map((t) => (
            <li key={t._id} style={{ marginBottom: 10 }}>
              <b>{t.title}</b> — due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "n/a"}
              <div style={{ opacity: 0.8 }}>{t.description}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                confidence: {t.userConfidence ?? "n/a"} | est: {t.userEstimatedTime ?? "n/a"} | ai diff:{" "}
                {t.aiDifficulty ?? "n/a"}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button onClick={load} style={{ marginTop: 16 }}>
        Refresh
      </button>
    </div>
  );
}