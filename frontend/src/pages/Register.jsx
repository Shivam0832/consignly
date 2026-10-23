import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BrandMark } from "../components/Layout";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form);
      navigate("/customer");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <BrandMark />
          Consignly
        </div>
        <p className="text-soft" style={{ marginBottom: 16, fontSize: 13.5 }}>
          Create a customer account to place and track deliveries.
        </p>

        {error && <div className="banner banner-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="r-name">Full name</label>
            <input id="r-name" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="r-email">Email</label>
            <input id="r-email" autoComplete="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="r-phone">Phone (for SMS updates)</label>
            <input id="r-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="9876543210" />
          </div>
          <div className="field">
            <label htmlFor="r-pass">Password</label>
            <input id="r-pass" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} />
            <span className="field-hint">At least 8 characters.</span>
          </div>
          <button className="btn btn-accent btn-block" type="submit" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
