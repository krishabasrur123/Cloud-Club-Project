// client/src/pages/Parser.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./auth.css";
import "./parser.css";

import clipboard from "../assets/clipboard.png";
import pencil from "../assets/pencil.png";
import lightbulb from "../assets/light.png";
import clock from "../assets/clock.png";

import QuestionModal from "../components/QuestionModal.jsx";


import pdfToText from 'react-pdftotext';



// Usage

// Parser.jsx


const MAX_MB = 20;
const ACCEPT_EXT = ["pdf", "pptx", "txt"];

function getExt(file) {
  let name = "";
  if (typeof file === "string") {
    name = file;
  } else if (file?.name) {
    name = file.name;
  } else if (file?.originalname) {
    name = file.originalname;
  }
  if (!name) return "";
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export async function loadFileContent(file) {
  const ext = getExt(file);
  let docs = "";

  if (ext === "pdf") {
    try {
      docs = await pdfToText(file);   // <-- return the extracted text
    } catch (err) {
      console.error("Failed to extract text from pdf", err);
    }
  }

  console.log(docs);
  return docs;  // <-- must return a string
}



const MOCK_QUESTIONS = [
  {
    title: "Question 1:",
    prompt: "How confident are you with matrix multiplication?",
    options: ["No exposure", "Basic familiarity", "Working knowledge", "Proficient", "Advanced"],
  },
  {
    title: "Question 2:",
    prompt: "How confident are you with eigenvalues/eigenvectors?",
    options: ["No exposure", "Basic familiarity", "Working knowledge", "Proficient", "Advanced"],
  },
];

let DATES =[];
let EXTARCTED_CONTENT=[];



export default function Parser() {

  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
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
      // ✅ later: call backend upload, wait for AI parse, then open questions
      // For now, simulate “AI read complete”

       let fileContent = "";

if (rawText && rawText.trim()) {
  // ✅ Use pasted text if available
  fileContent = rawText.trim();
} else if (file) {
  // ✅ Otherwise extract from uploaded file
  fileContent = await loadFileContent(file);
} else {
  throw new Error("Add text or upload a file first.");
}

         const deadlinesRes = await fetch("http://127.0.0.1:5001/api/extractDeadlines", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content: fileContent }),
});

if (!deadlinesRes.ok) {
  throw new Error("Failed to extract deadlines");
}

const deadlinesData = await deadlinesRes.json();

DATES = deadlinesData; 
console.log(deadlinesData);


    const extractRes = await fetch("http://127.0.0.1:5001/api/extractContent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: fileContent }),
    });

    if (!extractRes.ok) throw new Error("Failed to extract content");
const extractedData = await extractRes.json();

console.log(extractedData);
EXTARCTED_CONTENT = extractedData;

const text = extractedData
  .map(section => `
# ${section.Header}

## Questions
${section.Questions.map(q => `- ${q}`).join("\n")}

## Content
${section.Content}

## Summary
${section.Summary}
`)
  .join("\n\n");

console.log(text);



    const questionsRes = await fetch("http://127.0.0.1:5001/api/extractQuestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });

    if (!questionsRes.ok) throw new Error("Failed to generate questions");

    const questionsData = await questionsRes.json();

 const formattedQuestions = questionsData.questions.map((q, idx) => ({
  title: `Question ${idx + 1}:`,
  prompt: q.question,
  options: q.options,
  answer: q.answer,
  type:q.type
}));

    console.log(formattedQuestions);
    MOCK_QUESTIONS.splice(0, MOCK_QUESTIONS.length, ...formattedQuestions);

    setQIndex(0);
    setAnswers({});
setQuestionOpen(true);

   
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
  title={MOCK_QUESTIONS[qIndex]?.title}
  question={MOCK_QUESTIONS[qIndex]?.prompt}
  options={MOCK_QUESTIONS[qIndex]?.options || []}
  onClose={() => setQuestionOpen(false)}
 onSubmit={(selected) => {
  const currentQ = MOCK_QUESTIONS[qIndex];

  setAnswers((prev) => ({
    ...prev,
    [qIndex]: selected,
  }));

  const next = qIndex + 1;

  if (next < MOCK_QUESTIONS.length) {
    setQIndex(next);
  } else {
    setQuestionOpen(false);
  }
}}
/>
      
    </div>
  );
}