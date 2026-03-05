// client/src/pages/Parser.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QuestionModal from "../components/QuestionModal";

import "./auth.css";
import "./parser.css";

import clipboard from "../assets/clipboard.png";
import pencil from "../assets/pencil.png";
import lightbulb from "../assets/light.png";
import clock from "../assets/clock.png";

function isPdf(file) {
  if (!file) return false;
  return file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");
}

export default function Parser() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Question modal state
  const [questionOpen, setQuestionOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/auth");
  }, [navigate]);

  function validateAndSetFile(f) {
    if (!f) return;
    if (!isPdf(f)) {
      setError("Only PDF files are supported.");
      setFile(null);
      return;
    }
    setError("");
    setFile(f);
  }

  function onBrowseClick() {
    setError("");
    fileInputRef.current?.click();
  }

  async function onContinue() {
    setError("");

    if (!file) {
      setError("Please upload a PDF to continue.");
      return;
    }
    if (!isPdf(file)) {
      setError("Only PDF files are supported.");
      setFile(null);
      return;
    }

    setLoading(true);
    try {
      /**
       * For now: just store file info + profile so UI flow works.
       * Next: we will call the HuggingFace backend endpoint and store extracted JSON.
       */
      localStorage.setItem(
        "parser_upload_meta",
        JSON.stringify({
          filename: file.name,
          size: file.size,
          type: file.type,
          profile: profile || null,
          uploadedAt: new Date().toISOString(),
        })
      );

      // move user forward (or stay on parser if you want)
      navigate("/dashboard");
    } catch (e) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authPage">
      {/* top nav */}
      <div className="topNav topNavFull">
        <button className="pill active" onClick={() => navigate("/parser")}>
          input content
        </button>
        <button className="pill" onClick={() => navigate("/dashboard")}>
          dashboard
        </button>
        <button className="pill" onClick={() => navigate("/calendar")}>
          Calendar
        </button>

        <button className="pill" onClick={() => setQuestionOpen(true)}>
          + Add Question
        </button>
      </div>

      {/* background icons */}
      <img className="bgIcon bgClipboard" src={clipboard} alt="" />
      <img className="bgIcon bgPencil" src={pencil} alt="" />
      <img className="bgIcon bgLight" src={lightbulb} alt="" />
      <img className="bgIcon bgClock" src={clock} alt="" />

      {/* main step card */}
      <div className="parserShell">
        <div className="parserStepCard">
          {/* left side */}
          <div className="stepLeft">
            <div className="stepLabel">Step 1</div>

            <div className="stepButtons">
              <button className="stepBtn primary" onClick={onContinue} disabled={loading}>
                {loading ? "Loading..." : "Continue"}
              </button>

              <button className="stepBtn" onClick={onBrowseClick} disabled={loading}>
                Browse
              </button>
            </div>

            {file && (
              <div className="filePill" title={file.name}>
                {file.name}
              </div>
            )}

            {profile && (
              <div className="filePill" title="Saved questions">
                ✅ questions saved
              </div>
            )}

            {error && <div className="parserError">{error}</div>}
          </div>

          {/* drop zone */}
          <div
            className={`dropZone ${dragOver ? "dragOver" : ""}`}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              validateAndSetFile(f);
            }}
            onClick={onBrowseClick}
            role="button"
            tabIndex={0}
          >
            <div className="dropText">{file ? "PDF selected" : "drop file (pdf)"}</div>
            <div className="dropSub">{file ? "Click to replace" : "or click to browse"}</div>
          </div>

          {/* hidden input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              validateAndSetFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* modal */}
      <QuestionModal
        open={questionOpen}
        onClose={() => setQuestionOpen(false)}
        onSubmit={(payload) => {
          setProfile(payload);
          setQuestionOpen(false);
        }}
      />
    </div>
  );
}