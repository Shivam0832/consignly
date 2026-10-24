import { useEffect, useState } from "react";
import { Plus, Trash2, X, MapPinned } from "lucide-react";
import Layout from "../../components/Layout";
import Empty from "../../components/Empty";
import { useToast } from "../../components/Toaster";
import { api } from "../../api/client";

export default function Zones() {
  const toast = useToast();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [pins, setPins] = useState({}); // zoneId -> input text

  async function load() {
    try { setZones((await api.get("/zones")).zones); } catch (err) { toast(err.message, "bad"); } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function run(fn, msg) {
    setBusy(true);
    try { await fn(); if (msg) toast(msg); await load(); } catch (err) { toast(err.message, "bad"); } finally { setBusy(false); }
  }

  const createZone = (e) => {
    e.preventDefault();
    run(async () => { await api.post("/zones", { name: zoneName }); setZoneName(""); }, `${zoneName} created. Add its pincodes next.`);
  };

  // Accepts several pincodes at once: "110001, 110002 110003"
  const addPins = (zone) => (e) => {
    e.preventDefault();
    const list = (pins[zone.id] || "").split(/[\s,]+/).filter(Boolean);
    const bad = list.filter((p) => !/^\d{6}$/.test(p));
    if (!list.length) return;
    if (bad.length) return toast(`Not a 6-digit pincode: ${bad.join(", ")}`, "bad");
    run(async () => {
      for (const pincode of list) await api.post("/zones/areas", { pincode, zoneId: zone.id });
      setPins((p) => ({ ...p, [zone.id]: "" }));
    }, `${list.length} pincode${list.length === 1 ? "" : "s"} added to ${zone.name}.`);
  };

  const removePin = (a) => {
    if (!window.confirm(`Remove pincode ${a.pincode}? Orders to it can't be priced until it's added to a zone again.`)) return;
    run(() => api.del(`/zones/areas/${a.id}`), `${a.pincode} removed.`);
  };
  const removeZone = (z) => {
    if (!window.confirm(`Delete ${z.name}?`)) return;
    run(() => api.del(`/zones/${z.id}`), `${z.name} deleted.`);
  };

  return (
    <Layout
      title="Zones & pincodes"
      subtitle="Every pincode belongs to one zone. The zone pair decides the price: same zone or across zones."
      actions={
        <form className="input-group" onSubmit={createZone}>
          <label htmlFor="zone-name" className="sr-only">New zone name</label>
          <input id="zone-name" className="input" placeholder="New zone, e.g. West Zone" value={zoneName} onChange={(e) => setZoneName(e.target.value)} required style={{ width: 230 }} />
          <button className="btn btn-dark" disabled={busy}><Plus aria-hidden="true" />Add zone</button>
        </form>
      }
    >
      {loading ? <div className="cols-2">{[0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />)}</div> : zones.length === 0 ? (
        <div className="card"><Empty title="No zones yet">Create a zone, then add the pincodes it covers.</Empty></div>
      ) : (
        <div className="cols-2">
          {zones.map((z) => (
            <section key={z.id} className="card zone-card">
              <div className="row-between" style={{ marginBottom: 4 }}>
                <h3 className="row"><MapPinned size={18} style={{ color: "var(--route)" }} aria-hidden="true" />{z.name}</h3>
                <button className="btn btn-quiet btn-sm btn-icon" onClick={() => removeZone(z)} disabled={busy} aria-label={`Delete ${z.name}`} title="Delete zone"><Trash2 aria-hidden="true" /></button>
              </div>
              <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
                {z.areas?.length || 0} pincode{z.areas?.length === 1 ? "" : "s"}, {z.agents?.length || 0} agent{z.agents?.length === 1 ? "" : "s"} based here
              </p>
              <div className="chips" style={{ marginBottom: 14 }}>
                {z.areas?.map((a) => (
                  <span key={a.id} className="chip code">{a.pincode}<button onClick={() => removePin(a)} disabled={busy} aria-label={`Remove ${a.pincode}`}><X /></button></span>
                ))}
                {!z.areas?.length && <span className="muted" style={{ fontSize: 13 }}>No pincodes yet.</span>}
              </div>
              <form className="input-group" onSubmit={addPins(z)}>
                <label htmlFor={`pins-${z.id}`} className="sr-only">Add pincodes to {z.name}</label>
                <input id={`pins-${z.id}`} className="input input-sm input-code" placeholder="Add pincodes, comma separated" inputMode="numeric" value={pins[z.id] || ""} onChange={(e) => setPins((p) => ({ ...p, [z.id]: e.target.value }))} />
                <button className="btn btn-ghost btn-sm" disabled={busy}>Add</button>
              </form>
            </section>
          ))}
        </div>
      )}
    </Layout>
  );
}
