import { useMemo, useState } from "react";
import "./questionModal.css";

export default function QuestionModal({
  open,
  title = "Question 1:",
  question,
  options = [],
  onClose,
  onSubmit,
}) {
  const [selected, setSelected] = useState(null);

  // reset selection when question changes
  useMemo(() => {
    setSelected(null);
  }, [question]);

  if (!open) return null;

  return (
    <div className="qmOverlay" onMouseDown={onClose}>
      <div className="qmCard" onMouseDown={(e) => e.stopPropagation()}>
        <button className="qmClose" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="qmTitle">{title}</div>
        <div className="qmQuestion">{question}</div>

        <div className="qmOptions">
          {options.map((opt, idx) => (
            <label key={idx} className={`qmOpt ${selected === idx ? "active" : ""}`}>
              <input
                type="radio"
                name="qm"
                checked={selected === idx}
                onChange={() => setSelected(idx)}
              />
              <span>
                {idx + 1} - {opt}
              </span>
            </label>
          ))}
        </div>

        <button
          className="qmNext"
          onClick={() => onSubmit(selected)}
          disabled={selected === null}
          title={selected === null ? "Pick an option" : "Continue"}
        >
          →
        </button>
      </div>
    </div>
  );
}