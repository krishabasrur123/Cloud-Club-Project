import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./auth.css";
import "./parser.css";

import clipboard from "../assets/clipboard.png";
import pencil from "../assets/pencil.png";
import lightbulb from "../assets/light.png";
import clock from "../assets/clock.png";

import QuestionModal from "../components/QuestionModal.jsx";
import pdfToText from "react-pdftotext";
import { appendScheduledTasks } from "../lib/scheduledStore.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getExt(file) {
  let name = "";
  if (typeof file === "string") name = file;
  else if (file?.name) name = file.name;
  if (!name) return "";
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export async function loadFileContent(file) {
  const ext = getExt(file);
  if (ext === "pdf") {
    try { return await pdfToText(file); } catch (err) { console.error("PDF parse error", err); }
  } else if (ext === "txt") {
    return await file.text();
  }
  return "";
}

/** Format a YYYY-MM-DD string to "Month DD, YYYY" for display */
function formatDisplayDate(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  return `${months[m - 1]} ${d}, ${y}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Parser() {
  const navigate = useNavigate();

  // --- parse state ---
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- extracted data (kept in refs so QuestionModal close handler can read them) ---
  const datesRef = useRef([]);        // raw tasks from extractDeadlines
  const extractedContentRef = useRef([]);

  // --- parsed task cards shown in the right panel ---
  // Each item: { id, title, type, syllabusDueDate (YYYY-MM-DD), aiDifficulty, aiEstimatedTime }
  const [parsedTasks, setParsedTasks] = useState([]);

  // --- question modal ---
  const [questions, setQuestions] = useState([]);   // [{title, prompt, options, answer, type}]
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});        // { "0": "Option A", ... }
  const [questionOpen, setQuestionOpen] = useState(false);

  // --- scheduling ---
  const [scheduling, setScheduling] = useState(false);
  const [questionsComplete, setQuestionsComplete] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/auth");
  }, [navigate]);

  // Open question modal once questions arrive
  useEffect(() => {
    if (questions.length > 0) {
      setQIndex(0);
      setAnswers({});
      setQuestionsComplete(false);
      setQuestionOpen(true);
    }
  }, [questions]);

  // ---------------------------------------------------------------------------
  // Parse handler
  // ---------------------------------------------------------------------------
  async function handleParse() {
    setError("");
    setLoading(true);
    setQuestionsComplete(false);

    try {
      if (!rawText.trim() && !file) throw new Error("Add text or upload a file first.");

      let pdfText = "";
      if (file) pdfText = await loadFileContent(file);

      const combinedContent = [pdfText, rawText.trim()].filter(Boolean).join("\n\n---\n\n");

      // 1. Extract deadlines
      const deadlinesRes = await fetch("http://127.0.0.1:5001/api/extractDeadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: combinedContent }),
      });
      if (!deadlinesRes.ok) throw new Error("Failed to extract deadlines");
      const deadlinesData = await deadlinesRes.json();
      datesRef.current = deadlinesData;
      console.log("Extracted deadlines:", deadlinesData);

      // Build parsed task cards from deadlines
      const taskCards = deadlinesData.map((t, i) => ({
        id: `t_${i}`,
        title: t.description || t.type || `Task ${i + 1}`,
        type: t.type,
        syllabusDueDate: t.date,
        aiDifficulty: t.AI_estimateDifficulty,
        aiEstimatedTime: t.AI_estimateTime,
      }));
      setParsedTasks(taskCards);

      // 2. Extract content
      const extractRes = await fetch("http://127.0.0.1:5001/api/extractContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: combinedContent }),
      });
      if (!extractRes.ok) throw new Error("Failed to extract content");
      const extractedData = await extractRes.json();
      if (!extractedData || (Array.isArray(extractedData) && extractedData.length === 0)) {
        throw new Error("The AI couldn't find academic content. Try adding more detail.");
      }
      const dataArray = Array.isArray(extractedData) ? extractedData : [extractedData];
      extractedContentRef.current = dataArray;

      // 3. Generate questions from extracted content
      const formattedForQuestions = dataArray.map(s => `
# ${s.Header}
## Questions
${(s.Questions || []).map(q => `- ${q}`).join("\n")}
## Content
${s.Content}
## Summary
${s.Summary}
`).join("\n\n");

      const questionsRes = await fetch("http://127.0.0.1:5001/api/extractQuestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: formattedForQuestions }),
      });
      if (!questionsRes.ok) throw new Error("Failed to generate questions");
      const questionsData = await questionsRes.json();

      const formatted = questionsData.questions.map((q, idx) => ({
        title: `Question ${idx + 1}:`,
        prompt: q.question,
        options: q.options,
        answer: q.answer,   // correct answer (or "NONE" for meta-questions)
        type: q.type,       // "mcq" | "confidence" | "time_estimation"
      }));

      setQuestions(formatted);
    } catch (e) {
      setError(e.message || "Failed to parse.");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Question submit handler
  // ---------------------------------------------------------------------------
  function handleQuestionSubmit(selected) {
    const newAnswers = { ...answers, [qIndex]: selected };
    setAnswers(newAnswers);

    const next = qIndex + 1;
    if (next < questions.length) {
      setQIndex(next);
    } else {
      setQuestionOpen(false);
      setQuestionsComplete(true);  // all questions answered — unlock button
    }
  }

  // ---------------------------------------------------------------------------
  // Add to Dashboard — calls /api/schedule, logs to console, does nothing else
  // ---------------------------------------------------------------------------
  async function handleAddToDashboard() {
    if (parsedTasks.length === 0) return;
    setScheduling(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      console.log("[schedule] sending", {
        taskCount: datesRef.current.length,
        questionCount: questions.length,
        answerCount: Object.keys(answers).length,
        hasToken: !!token,
      });
      const res = await fetch("http://127.0.0.1:5001/api/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tasks: datesRef.current,
          answers,
          questions,
          todayDate: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        console.error("[schedule] server error:", err);
        throw new Error(err.error || `Server returned ${res.status}`);
      }

      const data = await res.json();

      // Save to shared store so Dashboard + Calendar can read it
      appendScheduledTasks(data.scheduled);

      // Log each scheduled task as requested
      console.log("========== SCHEDULED TASKS ==========");
      data.scheduled.forEach((t) => {
        console.log("Task:           ", t.title);
        console.log("Type:           ", t.type);
        console.log("Syllabus Due:   ", t.syllabusDueDate);
        console.log("Weighted Score: ", `${Math.round((t.weightedScore ?? 0) * 100)}%`);
        console.log("Assigned Dates: ", t.assignedDates.join(" → "));
        console.log("─────────────────────────────────────");
      });
      console.log("=====================================");

      // Navigate to dashboard to see the results
      navigate("/dashboard");
    } catch (e) {
      console.error("Schedule error:", e);
      setError(e.message || "Scheduling failed.");
    } finally {
      setScheduling(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="authPage">
      <div className="topNav topNavFull">
        <button className="pill active" onClick={() => navigate("/parser")}>Parser</button>
        <button className="pill" onClick={() => navigate("/dashboard")}>Dashboard</button>
        <button className="pill" onClick={() => navigate("/calendar")}>Calendar</button>
      </div>

      <img className="bgIcon bgClipboard" src={clipboard} alt="" />
      <img className="bgIcon bgPencil" src={pencil} alt="" />
      <img className="bgIcon bgLight" src={lightbulb} alt="" />
      <img className="bgIcon bgClock" src={clock} alt="" />

      <div className="parserWrap">
        {/* ── Left card: input ── */}
        <div className="parserCard">
          <div className="parserTitle">Input content</div>
          <div className="parserSub">
            Paste a syllabus or upload a PDF. We'll extract deadlines and generate a study plan.
          </div>

          <div className="parserRow">
            <label className="parserLabel">Upload (optional)</label>
            <input
              className="parserFile"
              type="file"
              accept=".pdf,.txt"
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
              onClick={() => { setFile(null); setRawText(""); setParsedTasks([]); setError(""); }}
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </div>

        {/* ── Right card: parsed tasks ── */}
        <div className="parserCard">
          <div className="parserTitle">Parsed tasks</div>
          <div className="parserSub">
            Tasks extracted from your syllabus with their due dates.
          </div>

          {parsedTasks.length === 0 ? (
            <div className="parserEmpty">Nothing parsed yet.</div>
          ) : (
            <>
              <div className="parsedList">
                {parsedTasks.map((t) => (
                  <div key={t.id} className="parsedItem">
                    <div className="parsedMain">
                      <div className="parsedName">{t.title}</div>
                      <div className="parsedMeta">
                        {t.type && <span className="parsedTag">{t.type}</span>}
                        {t.syllabusDueDate && (
                          <span>Due: {formatDisplayDate(t.syllabusDueDate)}</span>
                        )}
                        {t.aiDifficulty != null && (
                          <span>· Difficulty: {t.aiDifficulty}/10</span>
                        )}
                        {t.aiEstimatedTime != null && (
                          <span>· Est. {t.aiEstimatedTime}h</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                className="parserBtn full"
                onClick={handleAddToDashboard}
                disabled={scheduling || !questionsComplete}
                title={!questionsComplete ? "Answer all questions first" : undefined}
              >
                {scheduling ? "Scheduling..." : questionsComplete ? "Add to Dashboard" : "Answer questions first"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Question modal */}
      <QuestionModal
        open={questionOpen}
        title={questions[qIndex]?.title}
        question={questions[qIndex]?.prompt}
        options={questions[qIndex]?.options || []}
        onClose={() => setQuestionOpen(false)}
        onSubmit={handleQuestionSubmit}
      />
    </div>
  );
}
