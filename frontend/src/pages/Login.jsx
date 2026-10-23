import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";
import PasswordInput from "../components/PasswordInput";
import { homeFor } from "../components/nav";

const DEMO = [
  { role: "Admin", email: "admin@lastmile.com", what: "Dispatch & pricing" },
  { role: "Agent", email: "agent1@lastmile.com", what: "Deliver parcels" },
  { role: "Customer", email: "customer@lastmile.com", what: "Book & track" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(e, creds) {
    e?.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(creds?.email ?? email, creds?.password ?? password);
      navigate(homeFor(user.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h1>Welcome back</h1>
      <p>Sign in to book, dispatch or deliver.</p>

      {error && <div className="notice notice-bad" role="alert">{error}</div>}

      <form onSubmit={signIn}>
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="login-pass">Password</label>
          <PasswordInput id="login-pass" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-dark btn-lg btn-block" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>

      <p style={{ marginTop: 18, fontSize: 14 }} className="muted">
        New here? <Link to="/register">Create a customer account</Link>
      </p>

      <div className="demo">
        <div className="label">Try the demo in one click</div>
        <div className="demo-list">
          {DEMO.map((d) => (
            <button key={d.email} type="button" disabled={busy} onClick={(e) => signIn(e, { email: d.email, password: "password123" })}>
              <strong>{d.role}</strong>
              <span>{d.what}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
