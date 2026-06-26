// client/src/pages/Calendar.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";

import "./auth.css";
import "./calendar.css";

import clipboard from "../assets/clipboard.png";
import pencil    from "../assets/pencil.png";
import lightbulb from "../assets/light.png";
import clock     from "../assets/clock.png";

import { loadScheduledTasks, expandToSessionBlocks, saveScheduledTasks } from "../lib/scheduledStore.js";

// ── localizer ─────────────────────────────────────────────────────────────────
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { "en-US": enUS },
});

// ── helpers ───────────────────────────────────────────────────────────────────
function scoreToColor(score) {
  if (score >= 0.75) return "evHigh";
  if (score >= 0.45) return "evMed";
  return "evLow";
}

// ── custom event chip ─────────────────────────────────────────────────────────
function EventChip({ event }) {
  return (
    <div className={`calEvInner ${event.colorClass}`} title={event.tooltip}>
      <span className="calEvIcon">{event.icon}</span>
      <span className="calEvTitle">{event.title}</span>
    </div>
  );
}

// ── calendar page ─────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const navigate = useNavigate();

  const [blocks,        setBlocks]        = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  // Controlled calendar state — this is what makes Back/Next/view work
  const [calDate,       setCalDate]       = useState(new Date());
  const [calView,       setCalView]       = useState(Views.MONTH);

  // ── load tasks ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const cached = loadScheduledTasks();
      if (cached.length > 0) setBlocks(expandToSessionBlocks(cached));

      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch("http://127.0.0.1:5001/api/schedule", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          saveScheduledTasks(data.scheduled);
          setBlocks(expandToSessionBlocks(data.scheduled));
        }
      } catch (e) {
        console.warn("[calendar] fetch error:", e.message);
      }
    }
    load();
  }, []);

  // ── build rbc events ────────────────────────────────────────────────────
  const events = useMemo(() =>
    blocks
      .filter(b => b.sessionDate && !isNaN(b.sessionDate))
      .map(b => {
        const start = new Date(b.sessionDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(b.sessionDate);
        end.setHours(23, 59, 59, 999);
        return {
          id:         b.id,
          title:      b.title,
          start,
          end,
          allDay:     true,
          colorClass: scoreToColor(b.weightedScore),
          icon:       b.sessionType === "due_date" ? "📌" : "📚",
          tooltip:    [
            b.title,
            b.sessionType === "due_date" ? "Due date" : `Study session #${b.sessionNumber}`,
            `Syllabus due: ${b.syllabusDueDate}`,
            `Score: ${Math.round(b.weightedScore * 100)}%`,
            `Difficulty: ${b.aiDifficulty}/10`,
          ].join("\n"),
          block: b,
        };
      }),
  [blocks]);

  return (
    <div className="authPage">
      <div className="topNav topNavFull">
        <button className="pill" onClick={() => navigate("/parser")}>Parser</button>
        <button className="pill" onClick={() => navigate("/dashboard")}>Dashboard</button>
        <button className="pill active" onClick={() => navigate("/calendar")}>Calendar</button>
      </div>

      <img className="bgIcon bgClipboard" src={clipboard} alt="" />
      <img className="bgIcon bgPencil"    src={pencil}    alt="" />
      <img className="bgIcon bgLight"     src={lightbulb} alt="" />
      <img className="bgIcon bgClock"     src={clock}     alt="" />

      <div className="calPageShell">

        {/* legend */}
        <div className="calLegend">
          <div className="calLegItem"><span className="calSwatch evHigh" /> High priority</div>
          <div className="calLegItem"><span className="calSwatch evMed"  /> Medium priority</div>
          <div className="calLegItem"><span className="calSwatch evLow"  /> Low priority</div>
          <div className="calLegItem">📚 Study session</div>
          <div className="calLegItem">📌 Due date</div>
          {events.length > 0 && (
            <div className="calLegItem calLegCount">{events.length} sessions scheduled</div>
          )}
        </div>

        {events.length === 0 && (
          <div className="calEmpty">No sessions yet — parse a syllabus first.</div>
        )}

        {/* calendar */}
        <div className="calBigWrap">
          <Calendar
            localizer={localizer}
            events={events}
            // Controlled navigation — these two props make Back/Next/view work
            date={calDate}
            view={calView}
            onNavigate={date => setCalDate(date)}
            onView={view => setCalView(view)}
            views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
            style={{ height: 680 }}
            eventPropGetter={() => ({
              style: {
                background: "transparent",
                border: "none",
                padding: 0,
              },
            })}
            components={{ event: EventChip }}
            onSelectEvent={event => setSelectedEvent(event.block)}
            popup
          />
        </div>

        {/* detail panel */}
        {selectedEvent && (
          <div className="calDetail" onClick={() => setSelectedEvent(null)}>
            <div className="calDetailCard" onClick={e => e.stopPropagation()}>
              <button className="calDetailClose" onClick={() => setSelectedEvent(null)}>×</button>
              <div className="calDetailTitle">{selectedEvent.title}</div>
              <div className="calDetailRow"><b>Type:</b> {selectedEvent.type || "—"}</div>
              <div className="calDetailRow">
                <b>Session:</b>{" "}
                {selectedEvent.sessionType === "due_date"
                  ? "📌 Due date"
                  : `📚 Study session #${selectedEvent.sessionNumber}`}
              </div>
              <div className="calDetailRow"><b>Date:</b> {selectedEvent.sessionDateStr}</div>
              <div className="calDetailRow"><b>Syllabus due:</b> {selectedEvent.syllabusDueDate}</div>
              <div className="calDetailRow"><b>Priority score:</b> {Math.round(selectedEvent.weightedScore * 100)}%</div>
              <div className="calDetailRow"><b>AI difficulty:</b> {selectedEvent.aiDifficulty}/10</div>
              {selectedEvent.flagged && (
                <div className="calDetailFlag">⚠ Capacity conflict — consider rescheduling</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
