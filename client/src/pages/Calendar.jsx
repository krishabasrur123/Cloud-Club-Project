// client/src/pages/Calendar.jsx
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventModal from "../components/EventModal";

import "./auth.css";
import "./calendar.css";

import clipboard from "../assets/clipboard.png";
import pencil from "../assets/pencil.png";
import lightbulb from "../assets/light.png";
import clock from "../assets/clock.png";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOUR_HEIGHT = 56;
const MINUTES_STEP = 30;
const DAY_HEADER_H = 54;
const MIN_DURATION = 30;

const PRIORITY_COLOR = {
  High: "pink",
  Medium: "purple",
  Low: "yellow",
  Optional: "green",
};

// Mock AI schedule
const INITIAL_EVENTS = [
  { id: "e1", title: "Econ PS", priority: "High", day: 1, startMin: 20 * 60, durationMin: 90 },
  { id: "e2", title: "Stats HW", priority: "Medium", day: 2, startMin: 14 * 60, durationMin: 60 },
  { id: "e3", title: "Reading", priority: "Low", day: 4, startMin: 18 * 60 + 30, durationMin: 45 },
  { id: "e4", title: "Optional review", priority: "Optional", day: 5, startMin: 12 * 60, durationMin: 30 },
];

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function snapMinutes(min) {
  return Math.round(min / MINUTES_STEP) * MINUTES_STEP;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTime(mins) {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? "pm" : "am";
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${pad2(m)}${ampm}`;
}

function buildHours() {
  return Array.from({ length: 24 }).map((_, h) => {
    const ampm = h >= 12 ? "pm" : "am";
    const h12 = ((h + 11) % 12) + 1;
    return { label: `${h12}${ampm}`, hour: h };
  });
}

export default function Calendar() {
  const navigate = useNavigate();
  const gridRef = useRef(null);

  const [events, setEvents] = useState(INITIAL_EVENTS);

  // ✅ Event modal state
  const [eventModalOpen, setEventModalOpen] = useState(false);

  // Drag/resize state
  const opRef = useRef({
    active: false,
    kind: null, // "move" | "resizeTop" | "resizeBottom"
    id: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    originDay: 0,
    originStartMin: 0,
    originDurationMin: 0,
    colWidth: 0,
  });

  const hours = useMemo(() => buildHours(), []);

  function getGridMetrics() {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { colWidth: rect.width / 7 };
  }

  function updateEvent(id, patch) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function beginOp(e, ev, kind) {
    e.preventDefault();
    e.stopPropagation();

    const metrics = getGridMetrics();
    if (!metrics) return;

    const st = opRef.current;
    st.active = true;
    st.kind = kind;
    st.id = ev.id;
    st.pointerId = e.pointerId;
    st.startX = e.clientX;
    st.startY = e.clientY;
    st.originDay = ev.day;
    st.originStartMin = ev.startMin;
    st.originDurationMin = ev.durationMin;
    st.colWidth = metrics.colWidth;

    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    const st = opRef.current;
    if (!st.active || st.pointerId !== e.pointerId) return;

    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;

    // Convert dy pixels to minutes
    const minutesDelta = (dy / HOUR_HEIGHT) * 60;

    const dayMin = 0;
    const dayMax = 24 * 60;

    if (st.kind === "move") {
      const dayDelta = Math.round(dx / st.colWidth);
      const newDay = clamp(st.originDay + dayDelta, 0, 6);

      const rawStart = st.originStartMin + minutesDelta;
      const snappedStart = snapMinutes(rawStart);

      const maxStart = dayMax - Math.max(MIN_DURATION, st.originDurationMin);
      const boundedStart = clamp(snappedStart, dayMin, maxStart);

      updateEvent(st.id, { day: newDay, startMin: boundedStart });
      return;
    }

    if (st.kind === "resizeBottom") {
      const rawEnd = st.originStartMin + st.originDurationMin + minutesDelta;
      const snappedEnd = snapMinutes(rawEnd);

      const minEnd = st.originStartMin + MIN_DURATION;
      const boundedEnd = clamp(snappedEnd, minEnd, dayMax);

      const newDur = boundedEnd - st.originStartMin;
      updateEvent(st.id, { durationMin: newDur });
      return;
    }

    if (st.kind === "resizeTop") {
      const rawStart = st.originStartMin + minutesDelta;
      const snappedStart = snapMinutes(rawStart);

      const originEnd = st.originStartMin + st.originDurationMin;
      const maxStart = originEnd - MIN_DURATION;
      const boundedStart = clamp(snappedStart, dayMin, maxStart);

      const newDur = originEnd - boundedStart;
      updateEvent(st.id, { startMin: boundedStart, durationMin: newDur });
      return;
    }
  }

  function onPointerUp(e) {
    const st = opRef.current;
    if (!st.active || st.pointerId !== e.pointerId) return;

    st.active = false;
    st.kind = null;
    st.id = null;
    st.pointerId = null;
  }

  // ✅ Add event from modal
  function handleCreateEvent(payload) {
    // Expect payload shape from your EventModal.
    // Common options:
    // 1) payload already matches: { title, priority, day, startMin, durationMin }
    // 2) payload is datetime-based; adjust here if needed.

    const newEvent = {
      id: crypto.randomUUID(),
      title: payload.title ?? "New Event",
      priority: payload.priority ?? "Medium",
      day: clamp(payload.day ?? 0, 0, 6),
      startMin: snapMinutes(payload.startMin ?? 9 * 60),
      durationMin: clamp(payload.durationMin ?? MIN_DURATION, MIN_DURATION, 24 * 60),
    };

    setEvents((prev) => [newEvent, ...prev]);
    setEventModalOpen(false);
  }

  return (
    <div className="authPage">
      <div className="topNav topNavFull">
        <button className="pill" onClick={() => navigate("/parser")}>
          Parser
        </button>
        <button className="pill" onClick={() => navigate("/dashboard")}>
          Dashboard
        </button>
        <button className="pill active" onClick={() => navigate("/calendar")}>
          Calendar
        </button>

        {/* ✅ open event modal */}
        <button className="pill" onClick={() => setEventModalOpen(true)}>
          + Add Event
        </button>
      </div>

      <img className="bgIcon bgClipboard" src={clipboard} alt="" />
      <img className="bgIcon bgPencil" src={pencil} alt="" />
      <img className="bgIcon bgLight" src={lightbulb} alt="" />
      <img className="bgIcon bgClock" src={clock} alt="" />

      <div className="calShell">
        <div className="legend">
          <div className="legendItem">
            <span className="swatch pink" /> High
          </div>
          <div className="legendItem">
            <span className="swatch purple" /> Medium
          </div>
          <div className="legendItem">
            <span className="swatch yellow" /> Low
          </div>
          <div className="legendItem">
            <span className="swatch green" /> Optional
          </div>
          <div className="legendHint">
            Drag to move • Drag handles to resize • snaps to 30 min
          </div>
        </div>

        <div className="calGridWrap">
          {/* time rail */}
          <div className="timeRail">
            <div className="timeRailHeader" />
            {hours.map((h) => (
              <div key={h.hour} className="timeTick" style={{ height: HOUR_HEIGHT }}>
                <span>{h.label}</span>
              </div>
            ))}
          </div>

          {/* main week */}
          <div className="weekArea">
            <div className="dayHeaderRow" style={{ height: DAY_HEADER_H }}>
              {DAYS.map((d) => (
                <div key={d} className="dayHeaderCell">
                  {d}
                </div>
              ))}
            </div>

            <div
              className="gridBody"
              ref={gridRef}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{ height: HOUR_HEIGHT * 24 }}
            >
              {hours.map((h) => (
                <div
                  key={h.hour}
                  className="hourLine"
                  style={{ top: h.hour * HOUR_HEIGHT }}
                />
              ))}

              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="daySep"
                  style={{ left: `${((i + 1) / 7) * 100}%` }}
                />
              ))}

              {events.map((ev) => {
                const top = (ev.startMin / 60) * HOUR_HEIGHT;
                const height = (ev.durationMin / 60) * HOUR_HEIGHT;
                const leftPct = (ev.day / 7) * 100;
                const widthPct = (1 / 7) * 100;

                return (
                  <div
                    key={ev.id}
                    className={`calEvent ${PRIORITY_COLOR[ev.priority] || "pink"}`}
                    style={{
                      top,
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      height: Math.max(28, height),
                    }}
                  >
                    {/* resize handle (top) */}
                    <div
                      className="resizeHandle top"
                      onPointerDown={(e) => beginOp(e, ev, "resizeTop")}
                      title="Resize"
                    />

                    {/* move area */}
                    <div
                      className="eventBody"
                      onPointerDown={(e) => beginOp(e, ev, "move")}
                      title="Drag to move"
                    >
                      <div className="evTitle">{ev.title}</div>
                      <div className="evMeta">
                        {formatTime(ev.startMin)} –{" "}
                        {formatTime(ev.startMin + ev.durationMin)} • {ev.priority}
                      </div>
                    </div>

                    {/* resize handle (bottom) */}
                    <div
                      className="resizeHandle bottom"
                      onPointerDown={(e) => beginOp(e, ev, "resizeBottom")}
                      title="Resize"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="calFooterHint">
          Minimum duration: {MIN_DURATION} minutes • snapping: {MINUTES_STEP} minutes
        </div>
      </div>

      {/* ✅ Event Modal */}
      <EventModal
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        onCreate={handleCreateEvent}
      />
    </div>
  );
}