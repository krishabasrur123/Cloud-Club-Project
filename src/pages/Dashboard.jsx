import { useNavigate } from "react-router-dom";
import clipboard from "../assets/clipboard.png";
import pencil from "../assets/pencil.png";
import lightbulb from "../assets/light.png";
import clock from "../assets/clock.png";
import "./dashboard.css";

function ProgressDots({ pct = 20 }) {
  const total = 10;
  const filled = Math.round((pct / 100) * total);

  return (
    <div className="dotsWrap">
      <span className="dotsLabel">PROGRESS:</span>
      <div className="dots">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`dot ${i < filled ? "filled" : ""}`} />
        ))}
      </div>
      <span className="dotsPct">{pct}%</span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashPage">
      {/* TOP NAV */}
      <div className="dashTopNav">
        <div className="dashTabRow">
          <div
            className="dashPill"
            onClick={() => navigate("/parser")}
          >
            Input Content
          </div>

          <div className="dashPill active" onClick={() => navigate("/dashboard")}>
            Dashboard
          </div>

          <div
            className="dashPill"
            onClick={() => navigate("/calendar")}
          >
            Calendar
          </div>
        </div>
      </div>

      {/* FRAME */}
      <div className="dashFrame">
        {/* Background corner elements */}
        <div className="dashBg">
          <img src={clipboard} className="bgEl tl" alt="" />
          <img src={pencil} className="bgEl tr" alt="" />
          <img src={lightbulb} className="bgEl bl" alt="" />
          <img src={clock} className="bgEl br" alt="" />
        </div>

        {/* BOARD */}
        <div className="board">

          {/* TASKS COLUMN */}
          <section className="col">
            <div className="colHeader">
              <span className="tri">▶</span>
              <h2>Tasks</h2>
            </div>

            <div className="sortPill">
              Sort By: Scored Priority
            </div>

            <div className="card purple">
              <h3>Project Title</h3>
              <p>lorem ipsum dolor sit</p>
              <p>ipsum dolor</p>
              <div className="dateLine">
                Hard Date: 12/13/26
              </div>
            </div>

            <div className="card pink">
              <h3>Project Title</h3>
              <p>lorem ipsum dolor sit</p>
              <p>ipsum dolor</p>
            </div>
          </section>

          {/* IN PROGRESS COLUMN */}
          <section className="col">
            <div className="colHeader">
              <span className="tri">▶</span>
              <h2>In Progress</h2>
            </div>

            <div className="sortPill">
              Sort By: Date Due
            </div>

            <div className="card lemon">
              <h3>Project Title</h3>
              <p>lorem ipsum dolor sit</p>
              <p>ipsum dolor</p>
              <ProgressDots pct={20} />
              <div className="dateLine">
                Soft Date: 12/13/26
              </div>
            </div>

            <div className="card cream">
              <h3>Project Title</h3>
              <p>lorem ipsum dolor sit</p>
              <p>ipsum dolor</p>
              <ProgressDots pct={60} />
            </div>
          </section>

          {/* DONE COLUMN */}
          <section className="col">
            <div className="colHeader">
              <span className="tri">▶</span>
              <h2>Done</h2>
            </div>

            <div className="sortPill">
              Sort By: Difficulty
            </div>

            <div className="card mint">
              <h3>Project Title</h3>
              <p>lorem ipsum dolor sit</p>
              <p>ipsum dolor</p>
              <div className="dateLine">
                Hard Date: 12/13/26
              </div>
              <div className="dateLine">
                Date Finished: 12/6/26
              </div>
            </div>

            <div className="card mint2">
              <h3>Project Title</h3>
              <p>lorem ipsum dolor sit</p>
              <p>ipsum dolor</p>
              <div className="dateLine">
                Soft Date: 12/13/26
              </div>
              <div className="dateLine">
                Date Finished: 12/6/26
              </div>
            </div>

          </section>

        </div>
      </div>
    </div>
  );
}