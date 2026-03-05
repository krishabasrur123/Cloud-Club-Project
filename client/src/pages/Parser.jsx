// client/src/pages/Parser.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QuestionModal from "../components/QuestionModal";

import "./auth.css";
import "./parser.css";

import clipboard from "../assets/clipboard.png";
import pencil from "../assets/pencil.png";
import lightbulb from "../assets/light.png";
import clock from "../assets/clock.png";

export default function Parser() {
  const navigate = useNavigate();

  const [questionOpen, setQuestionOpen] = useState(false);

  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState([]); // [{title, due, course, priority, notes}]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/auth");
  }, [navigate]);

  async function handleParse() {
    setError("");
    setLoading(true);

    try {
      if (!rawText.trim() && !file) {
        throw new Error("Add text or upload a file first.");
      }

      const lines = rawText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const items = lines.map((line, i) => ({
        id: `p_${i}`,
        title: line.slice(0, 60),
        course: "",
        due: "",
        priority: "Medium",
        notes: line,
      }));

      setParsed(items);
    } catch (e) {
      setError(e.message || "Failed to parse.");
    } finally {
      setLoading(false);
    }
  }

  function addParsedToDashboardTasks() {
    const existing = JSON.parse(localStorage.getItem("draft_tasks") || "[]");
    localStorage.setItem("draft_tasks", JSON.stringify([...parsed, ...existing]));
    navigate("/dashboard");
  }

  return (
    <div className="authPage">
      <div className="topNav topNavFull">
        <button className="pill active" onClick={() => navigate("/parser")}>
          Parser
        </button>
        <button className="pill" onClick={() => navigate("/dashboard")}>
          Dashboard
        </button>
        <button className="pill" onClick={() => navigate("/calendar")}>
          Calendar
        </button>

        <button className="pill" onClick={() => setQuestionOpen(true)}>
          + Add Task
        </button>
      </div>

      <img className="bgIcon bgClipboard" src={clipboard} alt="" />
      <img className="bgIcon bgPencil" src={pencil} alt="" />
      <img className="bgIcon bgLight" src={lightbulb} alt="" />
      <img className="bgIcon bgClock" src={clock} alt="" />

      <div className="parserWrap">
        <div className="parserCard">
          <div className="parserTitle">Input content</div>
          <div className="parserSub">
            Paste deadlines / assignments or upload a file. We’ll convert it into structured tasks.
          </div>

          <div className="parserRow">
            <label className="parserLabel">Upload (optional)</label>
            <input
              className="parserFile"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="parserRow">
            <label className="parserLabel">Paste text</label>
            <textarea
              className="parserTextarea"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Example:\nEcon problem set due Thursday 10:50pm\nStats HW due Tuesday 2pm\nRead Chapter 5 by Friday`}
              rows={8}
            />
          </div>

          {error && <div className="parserError">{error}</div>}

          <div className="parserActions">
            <button className="parserBtn" onClick={handleParse} disabled={loading}>
              {loading ? "Parsing..." : "Parse"}
            </button>
            <button
              className="parserBtn ghost"
              onClick={() => {
                setFile(null);
                setRawText("");
                setParsed([]);
                setError("");
              }}
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="parserCard">
          <div className="parserTitle">Parsed tasks</div>
          <div className="parserSub">Review and send them to your dashboard.</div>

          {parsed.length === 0 ? (
            <div className="parserEmpty">Nothing parsed yet.</div>
          ) : (
            <>
              <div className="parsedList">
                {parsed.map((p) => (
                  <div key={p.id} className="parsedItem">
                    <div className="parsedMain">
                      <div className="parsedName">{p.title}</div>
                      <div className="parsedMeta">
                        {p.priority ? `Priority: ${p.priority}` : ""}{" "}
                        {p.due ? `• Due: ${p.due}` : ""}{" "}
                        {p.course ? `• ${p.course}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="parserBtn full" onClick={addParsedToDashboardTasks}>
                Add to Dashboard
              </button>
            </>
          )}
        </div>
      </div>

      <QuestionModal
        open={questionOpen}
        onClose={() => setQuestionOpen(false)}
        onSubmit={(payload) => {
          console.log("QuestionModal submit:", payload);
          setQuestionOpen(false);
        }}
      />
    </div>
  );
}