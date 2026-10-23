import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import Layout from "../../components/Layout";
import Empty from "../../components/Empty";
import PasswordInput from "../../components/PasswordInput";
import { useToast } from "../../components/Toaster";
import { api } from "../../api/client";

const blank = { name: "", email: "", phone: "", password: "", homeZoneId: "" };
const initials = (n = "") => n.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");

export default function Agents() {
  const toast = useToast();
  const [agents, setAgents] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(blank);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function load() {
    try {
      const [a, z] = await Promise.all([api.get("/admin/users?role=AGENT"), api.get("/zones")]);
      setAgents(a.users); setZones(z.zones);
    } catch (err) { toast(err.message, "bad"); } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function run(fn, msg) {
    setBusy(true);
    try { await fn(); toast(msg); await load(); } catch (err) { toast(err.message, "bad"); } finally { setBusy(false); }
  }

  const create = (e) => {
    e.preventDefault();
    run(async () => { await api.post("/admin/users", { ...form, role: "AGENT" }); setForm(blank); }, `${form.name} can now sign in as an agent.`);
  };
  const toggle = (a) => run(() => api.patch(`/admin/agents/${a.id}/status`, { isAvailable: !a.isAvailable }), `${a.name} is now ${a.isAvailable ? "off" : "on"} duty.`);
  const zone = (a, homeZoneId) => run(() => api.patch(`/admin/agents/${a.id}/status`, { homeZoneId: homeZoneId || null }), `${a.name}'s home zone updated.`);

  const onDuty = agents.filter((a) => a.isAvailable).length;

  return (
    <Layout title="Agents" subtitle={`${onDuty} of ${agents.length} on duty. Auto-assign picks on-duty agents in the parcel's pickup zone first.`}>
      <div className="layout-main-side">
        <div className="card card-flush">
          {loading ? <div style={{ padding: 20 }}><div className="skeleton" style={{ height: 120 }} /></div> : agents.length === 0 ? (
            <Empty title="No agents yet">Add your first delivery agent with the form.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Agent</th><th>Home zone</th><th>On duty</th></tr></thead>
                <tbody>
                  {agents.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="row" style={{ gap: 12 }}>
                          <span className="avatar" style={{ background: "var(--route-soft)", color: "var(--route)", borderColor: "transparent" }} aria-hidden="true">{initials(a.name)}</span>
                          <div><div className="cell-main">{a.name}</div><div className="cell-sub">{a.email}{a.phone ? `, ${a.phone}` : ""}</div></div>
                        </div>
                      </td>
                      <td>
                        <select className="input input-sm" style={{ width: 160 }} aria-label={`Home zone for ${a.name}`} value={a.homeZoneId || ""} disabled={busy} onChange={(e) => zone(a, e.target.value)}>
                          <option value="">No zone</option>
                          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <button className="switch" role="switch" aria-checked={a.isAvailable} aria-label={`${a.name} on duty`} disabled={busy} onClick={() => toggle(a)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form className="card sticky" onSubmit={create}>
          <div className="card-head"><h2>Add an agent</h2></div>
          <div className="field"><label htmlFor="ag-name">Full name</label><input id="ag-name" value={form.name} onChange={set("name")} required /></div>
          <div className="field"><label htmlFor="ag-email">Email</label><input id="ag-email" type="email" value={form.email} onChange={set("email")} required /></div>
          <div className="field"><label htmlFor="ag-phone">Mobile</label><input id="ag-phone" type="tel" value={form.phone} onChange={set("phone")} /></div>
          <div className="field"><label htmlFor="ag-pass">Temporary password</label><PasswordInput id="ag-pass" autoComplete="new-password" minLength={8} value={form.password} onChange={set("password")} /><span className="hint">At least 8 characters. Share it with the agent privately.</span></div>
          <div className="field">
            <label htmlFor="ag-zone">Home zone</label>
            <select id="ag-zone" value={form.homeZoneId} onChange={set("homeZoneId")}>
              <option value="">No zone</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <button className="btn btn-dark btn-block" type="submit" disabled={busy}><UserPlus aria-hidden="true" />Add agent</button>
        </form>
      </div>
    </Layout>
  );
}
