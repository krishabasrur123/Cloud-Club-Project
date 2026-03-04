import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./auth.css";
import "./dashboard.css";

import clipboard from "../assets/clipboard.png";
import pencil from "../assets/pencil.png";
import lightbulb from "../assets/light.png";
import clock from "../assets/clock.png";

// ✅ mocked AI tasks (swap with backend later)
const MOCK_TASKS = [
  {
    id: "t1",
    title: "Project Title",
    desc: "lorem ipsum dolor sit",
    due: "12/13/26",
    status: "todo",
    progress: 0.2,
    priorityScore: 0.88,
    difficulty: 3,
  },
  {
    id: "t2",
    title: "Project Title",
    desc: "lorem ipsum dolor sit",
    due: "12/13/26",
    status: "todo",
    progress: 0.0,
    priorityScore: 0.55,
    difficulty: 2,
  },
  {
    id: "t3",
    title: "Project Title",
    desc: "lorem ipsum dolor sit",
    due: "12/13/26",
    status: "inprogress",
    progress: 0.6,
    priorityScore: 0.76,
    difficulty: 4,
  },
  {
    id: "t4",
    title: "Project Title",
    desc: "lorem ipsum dolor sit",
    due: "12/13/26",
    status: "done",
    progress: 1.0,
    priorityScore: 0.40,
    difficulty: 1,
  },
];

function sortTasks(tasks, mode) {
  const copy = [...tasks];
  if (mode === "priority") return copy.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
  if (mode === "due") return copy.sort((a, b) => String(a.due).localeCompare(String(b.due)));
  if (mode === "difficulty") return copy.sort((a, b) => (b.difficulty ?? 0) - (a.difficulty ?? 0));
  return copy;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(MOCK_TASKS);

  const [sortTodo, setSortTodo] = useState("priority");
  const [sortProg, setSortProg] = useState("due");
  const [sortDone, setSortDone] = useState("difficulty");

  const todo = useMemo(
    () => sortTasks(tasks.filter((t) => t.status === "todo"), sortTodo),
    [tasks, sortTodo]
  );
  const inprog = useMemo(
    () => sortTasks(tasks.filter((t) => t.status === "inprogress"), sortProg),
    [tasks, sortProg]
  );
  const done = useMemo(
    () => sortTasks(tasks.filter((t) => t.status === "done"), sortDone),
    [tasks, sortDone]
  );

  function moveTask(id, status) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  return (
    <div className="authPage">
      <div className="topNav topNavFull">
        <button className="pill" onClick={() => navigate("/parser")}>input content</button>
        <button className="pill active" onClick={() => navigate("/dashboard")}>dashboard</button>
        <button className="pill" onClick={() => navigate("/calendar")}>Calendar</button>
      </div>

      <img className="bgIcon bgClipboard" src={clipboard} alt="" />
      <img className="bgIcon bgPencil" src={pencil} alt="" />
      <img className="bgIcon bgLight" src={lightbulb} alt="" />
      <img className="bgIcon bgClock" src={clock} alt="" />

      <div className="dashWrap">
        <Column
          title="Tasks"
          sortLabel="Sort By: Scored Priority"
          sortValue={sortTodo}
          onSort={(v) => setSortTodo(v)}
          theme="tasks"
          items={todo}
          onMove={moveTask}
        />
        <Column
          title="In Progress"
          sortLabel="Sort By: Date Due"
          sortValue={sortProg}
          onSort={(v) => setSortProg(v)}
          theme="progress"
          items={inprog}
          onMove={moveTask}
        />
        <Column
          title="Done"
          sortLabel="Sort By: Difficulty"
          sortValue={sortDone}
          onSort={(v) => setSortDone(v)}
          theme="done"
          items={done}
          onMove={moveTask}
        />
      </div>
    </div>
  );
}

function Column({ title, sortLabel, sortValue, onSort, theme, items, onMove }) {
  return (
    <div className={`col ${theme}`}>
      <div className="colHeader">
        <div className="colTitle">
          <span className="play">▶</span> {title}
        </div>

        <div className="sortRow">
          <div className="sortChip">{sortLabel}</div>
          <select className="sortSelect" value={sortValue} onChange={(e) => onSort(e.target.value)}>
            <option value="priority">Priority</option>
            <option value="due">Due date</option>
            <option value="difficulty">Difficulty</option>
          </select>
        </div>
      </div>

      <div className="colBody">
        {items.map((t) => (
          <TaskCard key={t.id} task={t} onMove={onMove} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, onMove }) {
  const pct = Math.round((task.progress ?? 0) * 100);

  return (
    <div className={`card ${task.status}`}>
      <div className="cardTitle">{task.title}</div>
      <div className="cardDesc">{task.desc}</div>

      <div className="progressRow">
        <div className="progressLabel">PROGRESS</div>
        <div className="dots">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className={`dot ${i < Math.round(pct / 10) ? "on" : ""}`} />
          ))}
        </div>
        <div className="pct">{pct}%</div>
      </div>

      <div className="cardMeta">Hard Date: {task.due}</div>

      {/* quick move buttons (later replace with drag/drop) */}
      <div className="moveRow">
        <button className="miniBtn" onClick={() => onMove(task.id, "todo")}>Tasks</button>
        <button className="miniBtn" onClick={() => onMove(task.id, "inprogress")}>In Progress</button>
        <button className="miniBtn" onClick={() => onMove(task.id, "done")}>Done</button>
      </div>
    </div>
  );
}