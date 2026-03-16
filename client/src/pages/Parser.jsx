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
      docs = await pdfToText(file);
    } catch (err) {
      console.error("Failed to extract text from pdf", err);
    }
  } 
  // ADD THIS: Handle plain text files
  else if (ext === "txt") {
    docs = await file.text(); 
  }

  return docs;
}

const MOCK_QUESTIONS = [

];

let DATES =[];
let EXTARCTED_CONTENT=[];



export default function Parser() {

  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);


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


  useEffect(() => {
  if (questions.length > 0) {
    console.log("Questions updated:", questions);

    setQIndex(0);
    setAnswers({});
    setQuestionOpen(true);
  }
}, [questions]);



async function handleParse() {
    setError("");
    setLoading(true);

    try {
      // 1. Check if we have any input at all
      if (!rawText.trim() && !file) {
        throw new Error("Add text or upload a file first.");
      }

      // 2. Extract PDF text if a file exists
      let pdfText = "";
      if (file) {
        pdfText = await loadFileContent(file);
      }

      // 3. Combine PDF text and TextArea text
      // We use .filter(Boolean) to make sure we don't add extra newlines if one is empty
      const combinedContent = [pdfText, rawText.trim()]
        .filter(Boolean)
        .join("\n\n---\n\n"); 

      console.log("Combined Content for API:", combinedContent);

      // 4. Send combinedContent to Deadlines API
      const deadlinesRes = await fetch("http://127.0.0.1:5001/api/extractDeadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: combinedContent }),
      });

      if (!deadlinesRes.ok) throw new Error("Failed to extract deadlines");
      const deadlinesData = await deadlinesRes.json();
      DATES = deadlinesData;

      // 5. Send combinedContent to Content Extraction API
      const extractRes = await fetch("http://127.0.0.1:5001/api/extractContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: combinedContent }),
      });

      if (!extractRes.ok) throw new Error("Failed to extract content");
      const extractedData = await extractRes.json();

      if (!extractedData || (Array.isArray(extractedData) && extractedData.length === 0)) {
        throw new Error("The AI couldn't find any academic content. Try adding more detail to the text box.");
      }

      const dataArray = Array.isArray(extractedData) ? extractedData : [extractedData];
      EXTARCTED_CONTENT = dataArray;

      // Format the extracted content for the Questions API
      const formattedTextForQuestions = dataArray
        .map(section => `
# ${section.Header}
## Questions
${(section.Questions || []).map(q => `- ${q}`).join("\n")}
## Content
${section.Content}
## Summary
${section.Summary}
`)
        .join("\n\n");

      // 6. Send formatted text to Questions API
      const questionsRes = await fetch("http://127.0.0.1:5001/api/extractQuestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: formattedTextForQuestions }),
      });

      if (!questionsRes.ok) throw new Error("Failed to generate questions");
      const questionsData = await questionsRes.json();

      const formattedQuestions = questionsData.questions.map((q, idx) => ({
        title: `Question ${idx + 1}:`,
        prompt: q.question,
        options: q.options,
        answer: q.answer,
        type: q.type
      }));

      setQuestions(formattedQuestions);

      // 7. Update the local "Parsed tasks" list for the UI
      const lines = combinedContent
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const items = lines.slice(0, 10).map((line, i) => ({
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
  title={questions[qIndex]?.title}
  question={questions[qIndex]?.prompt}
  options={questions[qIndex]?.options || []}
  onClose={() => setQuestionOpen(false)}
onSubmit={(selected) => {
  const currentQ = questions[qIndex];

  setAnswers((prev) => {
    const newAnswers = {
      ...prev,
      [qIndex]: selected,
    };

    console.log("Answer submitted for question", qIndex, ":", selected);
    console.log("Current answers state:", newAnswers);

    return newAnswers;
  });

  const next = qIndex + 1;

  if (next < questions.length) {
    console.log("Moving to next question:", next);
    setQIndex(next);
  } else {
    console.log("All questions answered. Closing modal.");
    setQuestionOpen(false);
  }
}}
/>
      
    </div>
  );
}