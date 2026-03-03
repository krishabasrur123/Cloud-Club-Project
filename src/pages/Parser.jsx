import { useState } from "react";
import { useNavigate } from "react-router-dom";
import clipboard from "../assets/clipboard.png";
import pencil from "../assets/pencil.png";
import lightbulb from "../assets/light.png";
import clock from "../assets/clock.png";
import "./parser.css";

export default function Parser() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const allowedTypes = [
    "application/pdf",
    "text/plain",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];

  function handleFile(selectedFile) {
    if (!selectedFile) return;

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Only PDF, PPT, PPTX or TXT files allowed");
      setFile(null);
      return;
    }

    setError("");
    setFile(selectedFile);
  }

  return (
    <div className="parserPage">

      {/* TOP NAV */}
      <div className="topNav">
        <div className="tabRow">
          <button
            className="pillTab active"
            onClick={() => navigate("/parser")}
          >
            Parser
          </button>

          <button
            className="pillTab"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>

          <button
            className="pillTab"
            onClick={() => navigate("/calendar")}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* MAIN FRAME */}
      <div className="frame">
        <div className="parserBg">
          <img src={clipboard} className="pbg clipboard" alt="" />
          <img src={pencil} className="pbg pencil" alt="" />
          <img src={lightbulb} className="pbg lightbulb" alt="" />
          <img src={clock} className="pbg clock" alt="" />
        </div>

        <div className="panel">
          <div className="stepText">Step 1</div>

          <div
            className="dropZone"
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              type="file"
              accept=".pdf,.ppt,.pptx,.txt"
              id="fileUpload"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {!file ? (
              <label htmlFor="fileUpload" className="dropBtn">
                drop file (pdf/pptx/txt)
              </label>
            ) : (
              <div className="fileName">{file.name}</div>
            )}
          </div>

          {error && <div className="error">{error}</div>}
        </div>
      </div>

    </div>
  );
}