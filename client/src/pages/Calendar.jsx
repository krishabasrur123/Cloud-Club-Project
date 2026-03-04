import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./auth.css";
import "./calendar.css";

import clipboard from "../assets/clipboard.png";
import pencil from "../assets/pencil.png";
import lightbulb from "../assets/light.png";
import clock from "../assets/clock.png";

// ✅ mocked AI “placements”
const MOCK_EVENTS = [
  { id: "e1", title: "Due 10:50pm", priority: "High", progress: "60%", day: 0, time: "10:50pm", color: "pink" },
  { id: "e2", title: "Due 8:00pm", priority: "Medium", progress: "40%", day: 1, time: "8:00pm", color: "pink" },
  { id: "e3", title: "Due 2:00pm", priority: "Low", progress: "20%", day: 2, time: "2:00pm", color: "yellow" },
  { id: "e4", title: "Due 5:00pm", priority: "High", progress: "30%", day: 3, time: "5:00pm", color: "purple" },
  { id: "e5", title: "Due 10:59pm", priority: "Optional", progress: "0%", day: 4, time: "10:59pm", color: "green" },
  { id: "e6", title: "Due 12:00pm", priority: "Medium", progress: "30%", day: 5, time: "12:00pm", color: "pink" },
];

const DAYS = [
  { name: "Sunday", date: "21" },
  { name: "Monday", date: "22" },
  { name: "Tuesday", date: "23" },
  { name: "Wednesday", date: "24" },
  { name: "Thursday", date: "25" },
  { name: "Friday", date: "26" },
  { name: "Saturday", date: "27" },
];

export default function Calendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState(MOCK_EVENTS);

  const byDay = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < 7; i++) map.set(i, []);
    for (const ev of events) map.get(ev.day).push(ev);
    return map;
  }, [events]);

  function moveEvent(evId, newDay) {
    setEvents((prev) => prev.map((e) => (e.id === evId ? { ...e, day: newDay } : e)));
  }

  return (
    <div className="authPage">
      <div className="topNav topNavFull">
        <button className="pill" onClick={() => navigate("/parser")}>input content</button>
        <button className="pill" onClick={() => navigate("/dashboard")}>dashboard</button>
        <button className="pill active" onClick={() => navigate("/calendar")}>Calendar</button>
      </div>

      <img className="bgIcon bgClipboard" src={clipboard} alt="" />
      <img className="bgIcon bgPencil" src={pencil} alt="" />
      <img className="bgIcon bgLight" src={lightbulb} alt="" />
      <img className="bgIcon bgClock" src={clock} alt="" />

      <div className="calWrap">
        <div className="weekGrid">
          {DAYS.map((d, idx) => (
            <div key={idx} className="dayCol">
              <div className="dayHead">
                <div className="dayName">{d.name}</div>
                <div className="dayDate">{d.date}</div>
              </div>

              <div className="dayBody">
                {(byDay.get(idx) || []).map((ev) => (
                  <CalendarEvent key={ev.id} ev={ev} onMove={moveEvent} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarEvent({ ev, onMove }) {
  return (
    <div className={`ev ${ev.color}`}>
      <div className="evTitle">{ev.title}</div>
      <div className="evMeta">Priority: {ev.priority}</div>
      <div className="evMeta">Progress: {ev.progress}</div>

      <div className="evMove">
        <select value={ev.day} onChange={(e) => onMove(ev.id, Number(e.target.value))}>
          <option value={0}>Sun</option>
          <option value={1}>Mon</option>
          <option value={2}>Tue</option>
          <option value={3}>Wed</option>
          <option value={4}>Thu</option>
          <option value={5}>Fri</option>
          <option value={6}>Sat</option>
        </select>
      </div>
    </div>
  );
}