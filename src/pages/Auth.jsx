import { useNavigate } from "react-router-dom";
import clipboard from "../assets/clipboard.png"
import pencil from "../assets/pencil.png"
import lightbulb from "../assets/light.png"
import clock from "../assets/clock.png"
import "./auth.css";


export default function Auth() {
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    navigate("/parser");
  }

  return (
    <div className="authPage">
      <div className="authShell">
        <div className="authBg">
          <img src={clipboard} className="bg clipboard" />
          <img src={pencil} className="bg pencil" />
          <img src={lightbulb} className="bg lightbulb" />
          <img src={clock} className="bg clock" />
        </div>
        <div className="authLeft">
          <h1>Welcome!</h1>
        </div>

        <div className="authRight">
          <div className="authFormWrap">
            <h2>Sign In</h2>

            <form onSubmit={handleSubmit} className="authForm">
              <label>
                <span>Username</span>
                <input type="text" required />
              </label>

              <label>
                <span>Password</span>
                <input type="password" required />
              </label>

              <button type="submit">Sign In</button>
            </form>

            <a className="authLink" href="/auth">
              no account? create new account
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}