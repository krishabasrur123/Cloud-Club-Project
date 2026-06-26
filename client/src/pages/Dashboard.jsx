import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./auth.css";
import "./dashboard.css";

import clipboard from "../assets/clipboard.png";
import pencil    from "../assets/pencil.png";
import lightbulb from "../assets/light.png";
import clock     from "../assets/clock.png";

import { loadScheduledTasks, expandToSessionBlocks, saveScheduledTasks, clearScheduledTasks } from "../lib/scheduledStore.js";

// ── helpers ───────────────────────────────────────────────────────────────────

function toMidnight(d) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function sameDay(a, b) {
  if (!a || !b || isNaN(a) || isNaN(b)) return false;
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function formatDisplay(date) {
  if (!date || isNaN(date)) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const MONTH_NAMES = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];
const WEEKDAYS    = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ── mini date picker ──────────────────────────────────────────────────────────

function MiniCalendar({ selectedDates, onToggle, onClear }) {
  const today = toMidnight(new Date());
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const firstDay   = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  function prevMonth() {
    setView(v => v.month === 0
      ? { year: v.year - 1, month: 11 }
      : { ...v, month: v.month - 1 });
  }
  function nextMonth() {
    setView(v => v.month === 11
      ? { year: v.year + 1, month: 0 }
      : { ...v, month: v.month + 1 });
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.year, view.month, d));

  return (
    <div className="miniCal">
      <div className="miniCalHeader">
        <button className="miniCalNav" onClick={prevMonth}>‹</button>
        <span className="miniCalTitle">{MONTH_NAMES[view.month]} {view.year}</span>
        <button className="miniCalNav" onClick={nextMonth}>›</button>
      </div>
      <div className="miniCalGrid">
        {WEEKDAYS.map(d => <div key={d} className="miniCalWd">{d}</div>)}
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;
          const isSelected = selectedDates.some(s => sameDay(s, date));
          const isToday    = sameDay(date, today);
          return (
            <button
              key={`${view.year}-${view.month}-${date.getDate()}`}
              className={`miniCalDay${isSelected ? " sel" : ""}${isToday ? " today" : ""}`}
              onClick={() => onToggle(toMidnight(date))}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="miniCalFooter">
        <button className="miniCalClear" onClick={onClear}>
          Show all tasks
        </button>
      </div>
    </div>
  );
}

// ── sort ──────────────────────────────────────────────────────────────────────

function sortBlocks(blocks, mode) {
  const copy = [...blocks];
  switch (mode) {
    case "priority":
      // chronological within same date, highest score first overall
      return copy.sort((a, b) =>
        b.weightedScore !== a.weightedScore
          ? b.weightedScore - a.weightedScore
          : a.sessionDate  - b.sessionDate
      );
    case "difficulty":
      return copy.sort((a, b) =>
        b.aiDifficulty !== a.aiDifficulty
          ? b.aiDifficulty - a.aiDifficulty
          : a.sessionDate  - b.sessionDate
      );
    case "task":
      return copy.sort((a, b) =>
        a.title !== b.title
          ? a.title.localeCompare(b.title)
          : a.sessionDate - b.sessionDate
      );
    default:
      return copy.sort((a, b) => a.sessionDate - b.sessionDate);
  }
}

function priorityColor(score) {
  if (score >= 0.75) return "priHigh";
  if (score >= 0.45) return "priMed";
  return "priLow";
}

// ── dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();

  const [allBlocks,     setAllBlocks]     = useState([]);
  // null = no filter (show all); array of Dates = filtered dates
  const [selectedDates, setSelectedDates] = useState(null);
  const [pickerOpen,    setPickerOpen]    = useState(false);
  const [sortMode,      setSortMode]      = useState("priority");
  const [fetching,      setFetching]      = useState(true);
  const pickerRef = useRef(null);

  // ── load from backend, fall back to localStorage cache ──────────────────
  useEffect(() => {
    async function load() {
      const cached = loadScheduledTasks();
      if (cached.length > 0) setAllBlocks(expandToSessionBlocks(cached));

      try {
        const token = localStorage.getItem("token");
        if (!token) { setFetching(false); return; }

        const res = await fetch("http://127.0.0.1:5001/api/schedule", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          console.log("[dashboard] tasks:", data.scheduled?.length,
            "| sessions on first task:", data.scheduled?.[0]?.sessions?.length,
            "| sample:", JSON.stringify(data.scheduled?.[0]?.sessions?.[0]));
          saveScheduledTasks(data.scheduled);
          setAllBlocks(expandToSessionBlocks(data.scheduled));
        } else {
          console.error("[dashboard] API returned", res.status);
        }
      } catch (e) {
        console.warn("[dashboard] fetch error:", e.message);
      } finally {
        setFetching(false);
      }
    }
    load();
  }, []);

  // close picker on outside click
  useEffect(() => {
    function onDown(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target))
        setPickerOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function toggleDate(date) {
    setSelectedDates(prev => {
      const arr = prev ?? [];
      const exists = arr.some(s => sameDay(s, date));
      return exists ? arr.filter(s => !sameDay(s, date)) : [...arr, date];
    });
  }

  // ── filtering: null selectedDates = show everything ──────────────────────
  const filtered = useMemo(() => {
    const valid = allBlocks.filter(b => b.sessionDate && !isNaN(b.sessionDate));
    if (!selectedDates || selectedDates.length === 0) return valid;
    return valid.filter(b => selectedDates.some(s => sameDay(s, b.sessionDate)));
  }, [allBlocks, selectedDates]);

  const sorted = useMemo(() => sortBlocks(filtered, sortMode), [filtered, sortMode]);

  // label for the picker button
  const dateLabel = useMemo(() => {
    if (!selectedDates || selectedDates.length === 0) return "All dates";
    if (selectedDates.length === 1) return formatDisplay(selectedDates[0]);
    const s = [...selectedDates].sort((a, b) => a - b);
    return `${formatDisplay(s[0])} – ${formatDisplay(s[s.length - 1])} (${s.length})`;
  }, [selectedDates]);

  return (
    <div className="authPage">
      <div className="topNav topNavFull">
        <button className="pill" onClick={() => navigate("/parser")}>Parser</button>
        <button className="pill active" onClick={() => navigate("/dashboard")}>Dashboard</button>
        <button className="pill" onClick={() => navigate("/calendar")}>Calendar</button>
        <button className="pill pillLogout" onClick={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          clearScheduledTasks();
          navigate("/auth");
        }}>Sign out</button>
      </div>

      <img className="bgIcon bgClipboard" src={clipboard} alt="" />
      <img className="bgIcon bgPencil"    src={pencil}    alt="" />
      <img className="bgIcon bgLight"     src={lightbulb} alt="" />
      <img className="bgIcon bgClock"     src={clock}     alt="" />

      <div className="dashShell">

        {/* toolbar */}
        <div className="dashToolbar">

          {/* date picker */}
          <div className="datePickerWrap" ref={pickerRef}>
            <button className="datePickerBtn" onClick={() => setPickerOpen(o => !o)}>
              📅 {dateLabel}
            </button>
            {pickerOpen && (
              <div className="datePickerDrop">
                <MiniCalendar
                  selectedDates={selectedDates ?? []}
                  onToggle={toggleDate}
                  onClear={() => { setSelectedDates(null); setPickerOpen(false); }}
                />
                <div className="datePickerHint">Click dates to filter • "Show all" removes filter</div>
              </div>
            )}
          </div>

          {/* sort pills */}
          <div className="sortWrap">
            <span className="sortLabel">Sort by</span>
            {[
              { key: "priority",   label: "Priority"   },
              { key: "difficulty", label: "Difficulty" },
              { key: "task",       label: "Task A–Z"   },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`sortPill${sortMode === key ? " active" : ""}`}
                onClick={() => setSortMode(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="taskCount">
            {sorted.length} session{sorted.length !== 1 ? "s" : ""}
            {selectedDates?.length ? ` on ${selectedDates.length} date(s)` : " total"}
          </div>
        </div>

        {/* cards */}
        {sorted.length === 0 ? (
          <div className="dashEmpty">
            {fetching
              ? "Loading your tasks…"
              : allBlocks.length === 0
                ? "No tasks yet — parse a syllabus first."
                : "No sessions on the selected date(s)."}
          </div>
        ) : (
          <div className="blockGrid">
            {sorted.map(b => <SessionBlock key={b.id} block={b} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── session card ──────────────────────────────────────────────────────────────

function SessionBlock({ block }) {
  const pct = Math.round((block.progress ?? 0) * 100);

  return (
    <div className={`sessionCard ${priorityColor(block.weightedScore)}`}>
      <div className="scTop">
        <div className="scTitle">{block.title}</div>
        <span className={`scTag ${block.sessionType === "due_date" ? "tagDue" : "tagStudy"}`}>
          {block.sessionType === "due_date" ? "📌 Due" : "📚 Study"}
        </span>
      </div>

      <div className="scMeta">
        <span className="scDate">{block.sessionDateStr}</span>
        {block.type && <span className="scType">{block.type}</span>}
        {block.flagged && <span className="scFlag">⚠ conflict</span>}
      </div>

      <div className="scDue">Syllabus due: {block.syllabusDueDate}</div>

      <div className="scProgress">
        <span className="scProgLabel">PROGRESS</span>
        <div className="scDots">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className={`dot${i < Math.round(pct / 10) ? " on" : ""}`} />
          ))}
        </div>
        <span className="scPct">{pct}%</span>
      </div>

      <div className="scScores">
        <span>Score {Math.round(block.weightedScore * 100)}%</span>
        <span>·</span>
        <span>Difficulty {block.aiDifficulty}/10</span>
      </div>
    </div>
  );
}
