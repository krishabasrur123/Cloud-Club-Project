import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./auth.css";
import "./parser.css";

import clipboard from "../assets/clipboard.png";
import pencil from "../assets/pencil.png";
import lightbulb from "../assets/light.png";
import clock from "../assets/clock.png";

import QuestionModal from "../components/QuestionModal.jsx";


import pdfToText from 'react-pdftotext'



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
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const [uploading, setUploading] = useState(false);

  // Step 2 modal state
  const [qOpen, setQOpen] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // {0: optionIndex, 1: optionIndex...}

  function validateAndSet(f) {
    setError("");
    if (!f) return;

    const ext = getExt(f.name);
    if (!ACCEPT_EXT.includes(ext)) {
      setFile(null);
      setError("Only PDF, PPTX, or TXT files are allowed.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      setError(`Max file size is ${MAX_MB}MB.`);
      return;
    }

    setFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    validateAndSet(e.dataTransfer.files?.[0]);
  }

  async function handleUpload() {
    if (!file) {
      setError("Pick a file first.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // ✅ later: call backend upload, wait for AI parse, then open questions
      // For now, simulate “AI read complete”

         const fileContent = await loadFileContent(file);

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
    setQOpen(true);


   
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setUploading(false);
    }
  }

  function submitOneQuestion(selectedIndex) {
    if (selectedIndex === null || selectedIndex === undefined) return;

    setAnswers((prev) => ({ ...prev, [qIndex]: selectedIndex }));

    const next = qIndex + 1;
    if (next < MOCK_QUESTIONS.length) {
      setQIndex(next);
    } else {
      // done with questionnaire
      setQOpen(false);

      // ✅ later: send answers to backend, get scored priorities/schedule
      // then navigate to dashboard
      navigate("/dashboard");
    }
  }

  const q = MOCK_QUESTIONS[qIndex];

  return (
    <div className="authPage">
      {/* top nav */}
      <div className="topNav topNavFull">
        <button className="pill active" onClick={() => navigate("/parser")}>input content</button>
        <button className="pill" onClick={() => navigate("/dashboard")}>dashboard</button>
        <button className="pill" onClick={() => navigate("/calendar")}>Calendar</button>
      </div>

      {/* background icons */}
      <img className="bgIcon bgClipboard" src={clipboard} alt="" />
      <img className="bgIcon bgPencil" src={pencil} alt="" />
      <img className="bgIcon bgLight" src={lightbulb} alt="" />
      <img className="bgIcon bgClock" src={clock} alt="" />

      {/* step 1 card */}
      <div className="authCard authCardParser">
        <div className="parserInner">
          <div className="parserLeft">
            <div className="parserStepSolid">Step 1</div>
            {file && <div className="parserFile">{file.name}</div>}
            {error && <div className="parserError">{error}</div>}

            <div className="parserActions">
              <button className="primaryBtn" onClick={handleUpload} disabled={uploading || !file}>
                {uploading ? "Reading..." : "Continue"}
              </button>
              <button className="secondaryBtn" onClick={() => inputRef.current?.click()} type="button">
                Browse
              </button>
            </div>
          </div>

          <div className="parserRight">
            <div
              className={`parserDrop ${dragOver ? "dragOver" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragOver(false);
              }}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
            >
              <div className="parserDropPillBottom">drop file (pdf/pptx/txt)</div>
              <input
                ref={inputRef}
                className="hiddenInput"
                type="file"
                accept=".pdf,.pptx,.txt"
                onChange={(e) => validateAndSet(e.target.files?.[0])}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step 2 modal */}
      <QuestionModal
        open={qOpen}
        title={q?.title}
        question={q?.prompt}
        options={q?.options || []}
        onClose={() => setQOpen(false)}
        onSubmit={submitOneQuestion}
      />
    </div>
  );
}