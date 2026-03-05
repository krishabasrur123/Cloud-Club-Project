import { useEffect, useState } from "react";
import "./questionModal.css";

export default function QuestionModal({ open, title, question, options = [], onClose, onSubmit }) {
  const [val, setVal] = useState("");

  useEffect(() => {
    if (open) setVal("");
  }, [open, title]); // reset val when modal opens or question changes

  if (!open) return null;

  function handleSubmit() {
    onSubmit?.(val); // return the selected option
    setVal(""); // reset for next question
  }

  return (
    <div className="qOverlay" onMouseDown={onClose}>
      <div className="qCard" onMouseDown={(e) => e.stopPropagation()}>
        <div className="qHeader">
          <div className="qTitleWrap">
            <div className="qSmall">{title}</div>
            <div className="qQuestion">{question}</div>
          </div>

          <button className="qClose" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="qBody">
          {options.map((opt, idx) => (
            <label key={idx} className="qOption">
              <input
                type="radio"
                name="qOption"
                value={opt}
                checked={val === opt}
                onChange={(e) => setVal(e.target.value)}
              />
              {opt}
            </label>
          ))}
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