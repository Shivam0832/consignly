import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { api } from "../../api/client";

export default function Zones() {
  const [zones, setZones] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newZoneName, setNewZoneName] = useState("");
  const [pincode, setPincode] = useState("");
  const [zoneForPincode, setZoneForPincode] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api.get("/zones");
      setZones(data.zones);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreateZone(e) {
    e.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    try {
      await api.post("/zones", { name: newZoneName });
      setNewZoneName("");
      setNotice("Zone created.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignArea(e) {
    e.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    try {
      await api.post("/zones/areas", { pincode, zoneId: zoneForPincode });
      setPincode("");
      setNotice(`Pincode ${pincode} mapped.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveArea(id) {
    setBusy(true);
    try {
      await api.del(`/zones/areas/${id}`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteZone(id) {
    setBusy(true);
    setError("");
    try {
      await api.del(`/zones/${id}`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title="Zones & Areas" subtitle="Define delivery zones and map pincodes to them — this drives zone detection for every order">
      {error && <div className="banner banner-error">{error}</div>}
      {notice && <div className="banner banner-success">{notice}</div>}

      <div className="grid grid-2" style={{ alignItems: "start", marginBottom: 20 }}>
        <form className="card" onSubmit={handleCreateZone}>
          <div className="card-title">Create a zone</div>
          <div className="flex gap-2">
            <input value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} placeholder="e.g. West Zone" required style={{ flex: 1, padding: 10, borderRadius: 6, border: "1.5px solid var(--paper-100)" }} />
            <button className="btn btn-accent btn-sm" type="submit" disabled={busy}>Create</button>
          </div>
        </form>

        <form className="card" onSubmit={handleAssignArea}>
          <div className="card-title">Map a pincode to a zone</div>
          <div className="flex gap-2">
            <input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Pincode" required style={{ width: 130, padding: 10, borderRadius: 6, border: "1.5px solid var(--paper-100)" }} />
            <select value={zoneForPincode} onChange={(e) => setZoneForPincode(e.target.value)} required style={{ flex: 1, padding: 10, borderRadius: 6, border: "1.5px solid var(--paper-100)" }}>
              <option value="">Select zone…</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
            <button className="btn btn-accent btn-sm" type="submit" disabled={busy}>Map</button>
          </div>
        </form>
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        {zones.map((zone) => (
          <div className="card" key={zone.id}>
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{zone.name}</div>
                <div className="text-soft" style={{ fontSize: 12.5 }}>{zone.agents?.length || 0} agent(s) based here</div>
              </div>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => handleDeleteZone(zone.id)}>Delete zone</button>
            </div>
            {zone.areas?.length === 0 ? (
              <p className="text-soft" style={{ fontSize: 13 }}>No pincodes mapped yet.</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {zone.areas.map((a) => (
                  <span key={a.id} className="mono" style={{ fontSize: 12, background: "var(--paper-50)", padding: "4px 8px", borderRadius: 5, display: "flex", alignItems: "center", gap: 6 }}>
                    {a.pincode}
                    <button onClick={() => handleRemoveArea(a.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--rust-500)", fontWeight: 700 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}
