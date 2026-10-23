import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BrandMark } from "../components/Layout";

const DEMO = [
  { role: "Admin", email: "admin@lastmile.com" },
  { role: "Agent", email: "agent1@lastmile.com" },
  { role: "Customer", email: "customer@lastmile.com" },
];

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

  function fillDemo(demoEmail) {
    setEmail(demoEmail);
    setPassword("password123");
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <BrandMark />
          Consignly
        </div>

        <p className="text-soft" style={{ marginBottom: 16, fontSize: 13.5 }}>Sign in to place, dispatch and track deliveries.</p>

        {error && <div className="banner banner-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="login-pass">Password</label>
            <input id="login-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-accent btn-block" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="auth-switch">
          New customer? <Link to="/register">Create an account</Link>
        </div>

        <div className="demo-creds">
          <strong>Try a demo account</strong>
          <span className="text-soft"> — password123</span>
          <div className="demo-grid">
            {DEMO.map((d) => (
              <button type="button" key={d.email} className="demo-btn" onClick={() => fillDemo(d.email)}>
                <b>{d.role}</b>
                <span>{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
