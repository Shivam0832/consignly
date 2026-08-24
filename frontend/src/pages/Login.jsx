import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "ADMIN" ? "/admin" : user.role === "AGENT" ? "/agent" : "/customer");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(role) {
    const creds = {
      admin: "admin@lastmile.com",
      agent: "agent1@lastmile.com",
      customer: "customer@lastmile.com",
    };
    setEmail(creds[role]);
    setPassword("password123");
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="sidebar-mark" style={{ width: 30, height: 30 }}>
            <svg width="16" height="16" viewBox="0 0 100 100" fill="none">
              <path d="M20 65 L50 30 L80 65" stroke="#0d1526" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Consignly
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-accent btn-block" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="auth-switch">
          New customer? <Link to="/register">Create an account</Link>
        </div>

        <div className="demo-creds">
          <strong>Demo logins</strong> (password: password123) — click to autofill:
          <div>
            <a onClick={() => fillDemo("admin")} style={{ cursor: "pointer" }}>admin@lastmile.com (Admin)</a>
          </div>
          <div>
            <a onClick={() => fillDemo("agent")} style={{ cursor: "pointer" }}>agent1@lastmile.com (Agent)</a>
          </div>
          <div>
            <a onClick={() => fillDemo("customer")} style={{ cursor: "pointer" }}>customer@lastmile.com (Customer)</a>
          </div>
        </div>
      </div>
    </div>
  );
}
