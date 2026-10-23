import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { api } from "../../api/client";

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [zones, setZones] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", homeZoneId: "" });

  async function load() {
    try {
      const [a, z] = await Promise.all([api.get("/admin/users?role=AGENT"), api.get("/zones")]);
      setAgents(a.users);
      setZones(z.zones);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await api.post("/admin/users", { ...form, role: "AGENT" });
      setNotice(`Agent ${form.name} created.`);
      setForm({ name: "", email: "", phone: "", password: "", homeZoneId: "" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeZone(agent, homeZoneId) {
    setBusy(true); setError(""); setNotice("");
    try {
      await api.patch(`/admin/agents/${agent.id}/status`, { homeZoneId: homeZoneId || null });
      setNotice(`${agent.name}'s home zone updated.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleAvailability(agent) {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/admin/agents/${agent.id}/status`, { isAvailable: !agent.isAvailable });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title="Delivery Agents" subtitle="Manage your agent workforce and their home zones">
      {error && <div className="banner banner-error" role="alert">{error}</div>}
      {notice && <div className="banner banner-success">{notice}</div>}

      <form className="card" onSubmit={handleCreate} style={{ marginBottom: 20 }}>
        <div className="card-title">Add a new agent</div>
        <div className="grid grid-3">
          <div className="field"><label htmlFor="ag-name">Name</label><input id="ag-name" value={form.name} onChange={(e) => set("name", e.target.value)} required /></div>
          <div className="field"><label htmlFor="ag-email">Email</label><input id="ag-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required /></div>
          <div className="field"><label htmlFor="ag-phone">Phone</label><input id="ag-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
          <div className="field"><label htmlFor="ag-password">Password</label><input id="ag-password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} /></div>
          <div className="field">
            <label htmlFor="ag-zone">Home zone</label>
            <select id="ag-zone" value={form.homeZoneId} onChange={(e) => set("homeZoneId", e.target.value)}>
              <option value="">None</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-accent" type="submit" disabled={busy}>Create agent</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Home zone</th><th>Availability</th><th></th></tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>
                  <select className="input input-sm" aria-label={`Home zone for ${a.name}`} value={a.homeZoneId || ""} disabled={busy} onChange={(e) => changeZone(a, e.target.value)}>
                    <option value="">No zone</option>
                    {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </td>
                <td>
                  <span className={`badge ${a.isAvailable ? "badge-teal" : "badge-rust"}`}>
                    <span className="badge-dot" />{a.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => toggleAvailability(a)}>
                    {a.isAvailable ? "Mark unavailable" : "Mark available"}
                  </button>
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr><td colSpan={5} className="text-soft" style={{ textAlign: "center", padding: 24 }}>No agents yet — add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
