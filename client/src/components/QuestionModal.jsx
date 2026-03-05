import { useEffect, useState } from "react";
import "./questionModal.css";

export default function QuestionModal({ open, onClose, onSubmit }) {
  const [val, setVal] = useState("");

  useEffect(() => {
    if (open) setVal("");
  }, [open]);

  if (!open) return null;

  function handleSubmit() {
    // You can expand this later to multiple questions.
    onSubmit?.({ matrix_mult_confidence: Number(val) });
  }

  return (
    <div className="qOverlay" onMouseDown={onClose}>
      <div className="qCard" onMouseDown={(e) => e.stopPropagation()}>
        <div className="qHeader">
          <div className="qTitleWrap">
            <div className="qSmall">Question 1:</div>
            <div className="qQuestion">
              How confident are you with matrix multiplication?
            </div>
          </div>

          <button className="qClose" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="qBody">
          <label className="qOption">
            <input
              type="radio"
              name="q1"
              value="1"
              checked={val === "1"}
              onChange={(e) => setVal(e.target.value)}
            />
            1 - No exposure
          </label>

          <label className="qOption">
            <input
              type="radio"
              name="q1"
              value="2"
              checked={val === "2"}
              onChange={(e) => setVal(e.target.value)}
            />
            2 - Basic familiarity
          </label>

          <label className="qOption">
            <input
              type="radio"
              name="q1"
              value="3"
              checked={val === "3"}
              onChange={(e) => setVal(e.target.value)}
            />
            3 - Working knowledge
          </label>

          <label className="qOption">
            <input
              type="radio"
              name="q1"
              value="4"
              checked={val === "4"}
              onChange={(e) => setVal(e.target.value)}
            />
            4 - Proficient
          </label>

          <label className="qOption">
            <input
              type="radio"
              name="q1"
              value="5"
              checked={val === "5"}
              onChange={(e) => setVal(e.target.value)}
            />
            5 - Advanced
          </label>
        </div>

        <div className="qFooter">
          <button className="qNext" onClick={handleSubmit} disabled={!val} aria-label="Next">
            →
          </button>
        </div>
      </div>
    </div>
  );
}