 // src/pages/Signup.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./auth.css";

import clipboard from "../assets/clipboard.png";
import pencil from "../assets/pencil.png";
import lightbulb from "../assets/light.png";
import clock from "../assets/clock.png";

import { api, setSession } from "../lib/api";

export default function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Use api.register if you added it in src/lib/api.js
      const res = await api.register({ name, email, password });

      // Expecting backend returns: { _id, name, email, token }
      setSession({
        token: res.token,
        user: { _id: res._id, name: res.name, email: res.email },
      });

      navigate("/dashboard");
    } catch (err) {
      // ✅ SHOW THE REAL ERROR
      console.log("SIGNUP ERROR:", err);
      setError(String(err?.message || err || "Signup failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authPage">
      {/* top nav */}
      <div className="topNav">
        <button className="pill" onClick={() => navigate("/auth")}>
          Login
        </button>
        <button className="pill" onClick={() => navigate("/parser")}>
          Parser
        </button>
        <button className="pill" onClick={() => navigate("/dashboard")}>
          Dashboard
        </button>
      </div>

      {/* background icons */}
      <img className="bgIcon bgClipboard" src={clipboard} alt="" />
      <img className="bgIcon bgPencil" src={pencil} alt="" />
      <img className="bgIcon bgLight" src={lightbulb} alt="" />
      <img className="bgIcon bgClock" src={clock} alt="" />

      {/* card */}
      <div className="authCard">
        <h1 className="authTitle">Create Account</h1>

        <form className="authForm" onSubmit={onSubmit}>
          <label className="authLabel">Name</label>
          <input
            className="authInput"
            value={name}
            onChange={(e) => setName(e.target.value)}
            type="text"
            placeholder="Your name"
            required
          />

          <label className="authLabel">Email</label>
          <input
            className="authInput"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@gmail.com"
            required
          />

          <label className="authLabel">Password</label>
          <input
            className="authInput"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            required
          />

          {error && <div className="authError">{error}</div>}

          <button className="authButton" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="authSignupText">
          Already have an account?{" "}
          <span className="authSignupLink" onClick={() => navigate("/auth")}>
            Login
          </span>
        </p>
      </div>
    </div>
  );
}