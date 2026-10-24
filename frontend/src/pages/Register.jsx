import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";
import PasswordInput from "../components/PasswordInput";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form);
      navigate("/customer/new");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h1>Create your account</h1>
      <p>Book your first delivery in under a minute.</p>

      {error && <div className="notice notice-bad" role="alert">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="r-name">Full name</label>
          <input id="r-name" autoComplete="name" value={form.name} onChange={set("name")} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="r-email">Email</label>
          <input id="r-email" type="email" autoComplete="email" value={form.email} onChange={set("email")} required />
        </div>
        <div className="field">
          <label htmlFor="r-phone">Mobile number</label>
          <input id="r-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} placeholder="For SMS delivery updates" />
        </div>
        <div className="field">
          <label htmlFor="r-pass">Password</label>
          <PasswordInput id="r-pass" autoComplete="new-password" minLength={8} value={form.password} onChange={set("password")} />
          <span className="hint">At least 8 characters.</span>
        </div>
        <button className="btn btn-dark btn-lg btn-block" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
      </form>

      <p style={{ marginTop: 18, fontSize: 14 }} className="muted">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
