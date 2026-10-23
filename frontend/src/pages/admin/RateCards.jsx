import { useEffect, useState } from "react";
import { MapPin, Route, User, Building2, Banknote } from "lucide-react";
import Layout from "../../components/Layout";
import { useToast } from "../../components/Toaster";
import { api } from "../../api/client";
import { money } from "../../lib/orderStatus";

const TYPES = [
  { orderType: "B2C", name: "Personal", icon: User },
  { orderType: "B2B", name: "Business", icon: Building2 },
];
const ZONES = [
  { zoneType: "INTRA", name: "Same zone", icon: MapPin },
  { zoneType: "INTER", name: "Across zones", icon: Route },
];

export default function RateCards() {
  const toast = useToast();
  const [form, setForm] = useState({});
  const [cod, setCod] = useState({});
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api.get("/rate-cards");
      const f = {};
      data.rateCards.forEach((rc) => { f[`${rc.orderType}-${rc.zoneType}`] = { baseCharge: rc.baseCharge, ratePerKg: rc.ratePerKg }; });
      setForm(f);
      const c = {};
      data.codSurcharges.forEach((s) => { c[s.orderType] = { type: s.type, value: s.value }; });
      setCod(c);
    } catch (err) { toast(err.message, "bad"); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const upd = (key, field) => (e) => setForm((f) => ({ ...f, [key]: { ...f[key], [field]: e.target.value } }));
  const updCod = (t, field) => (e) => setCod((c) => ({ ...c, [t]: { type: "FLAT", ...c[t], [field]: e.target.value } }));

  async function save(orderType, zoneType) {
    const v = form[`${orderType}-${zoneType}`] || {};
    setBusy(true);
    try {
      await api.post("/rate-cards", { orderType, zoneType, baseCharge: v.baseCharge === "" ? 0 : Number(v.baseCharge ?? 0), ratePerKg: v.ratePerKg === "" || v.ratePerKg === undefined ? "" : Number(v.ratePerKg) });
      toast("Price saved. New quotes use it straight away.");
      await load();
    } catch (err) { toast(err.message, "bad"); } finally { setBusy(false); }
  }
  async function saveCod(orderType) {
    const v = cod[orderType] || { type: "FLAT", value: "" };
    setBusy(true);
    try {
      await api.post("/rate-cards/cod-surcharge", { orderType, type: v.type, value: v.value === "" ? "" : Number(v.value) });
      toast("Cash on delivery fee saved.");
      await load();
    } catch (err) { toast(err.message, "bad"); } finally { setBusy(false); }
  }

  // Example price for a 2 kg parcel, so admins see what a change means.
  const example = (v) => (v && v.ratePerKg !== "" ? money(Number(v.baseCharge || 0) + 2 * Number(v.ratePerKg || 0)) : "—");

  return (
    <Layout title="Pricing" subtitle="Every quote is base charge plus weight times the rate per kg. Changes apply to new quotes immediately.">
      {TYPES.map((t) => (
        <section key={t.orderType} style={{ marginBottom: 28 }}>
          <h2 className="row" style={{ marginBottom: 12 }}><t.icon size={18} aria-hidden="true" />{t.name} shipments</h2>
          <div className="cols-3">
            {ZONES.map((z) => {
              const key = `${t.orderType}-${z.zoneType}`;
              const v = form[key] || { baseCharge: "", ratePerKg: "" };
              return (
                <form key={key} className="card rate-card" onSubmit={(e) => { e.preventDefault(); save(t.orderType, z.zoneType); }}>
                  <div className="route-kind"><z.icon aria-hidden="true" /><strong>{z.name}</strong></div>
                  <div className="grid-fields">
                    <div className="field" style={{ margin: 0 }}><label htmlFor={`${key}-b`}>Base (₹)</label><input id={`${key}-b`} type="number" min="0" step="0.5" value={v.baseCharge} onChange={upd(key, "baseCharge")} /></div>
                    <div className="field" style={{ margin: 0 }}><label htmlFor={`${key}-r`}>Per kg (₹)</label><input id={`${key}-r`} type="number" min="0" step="0.5" value={v.ratePerKg} onChange={upd(key, "ratePerKg")} required /></div>
                  </div>
                  <div className="row-between">
                    <span className="muted" style={{ fontSize: 13 }}>2 kg parcel: <strong style={{ color: "var(--ink)" }}>{example(v)}</strong></span>
                    <button className="btn btn-ghost btn-sm" disabled={busy}>Save</button>
                  </div>
                </form>
              );
            })}
            <form className="card rate-card" onSubmit={(e) => { e.preventDefault(); saveCod(t.orderType); }}>
              <div className="route-kind"><Banknote aria-hidden="true" /><strong>Cash on delivery fee</strong></div>
              <div className="grid-fields">
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={`${t.orderType}-ct`}>Charged as</label>
                  <select id={`${t.orderType}-ct`} value={cod[t.orderType]?.type || "FLAT"} onChange={updCod(t.orderType, "type")}>
                    <option value="FLAT">Flat ₹</option>
                    <option value="PERCENT">% of charge</option>
                  </select>
                </div>
                <div className="field" style={{ margin: 0 }}><label htmlFor={`${t.orderType}-cv`}>Amount</label><input id={`${t.orderType}-cv`} type="number" min="0" step="0.1" value={cod[t.orderType]?.value ?? ""} onChange={updCod(t.orderType, "value")} required /></div>
              </div>
              <div className="row-between">
                <span className="muted" style={{ fontSize: 13 }}>Added only when paying in cash</span>
                <button className="btn btn-ghost btn-sm" disabled={busy}>Save</button>
              </div>
            </form>
          </div>
        </section>
      ))}
    </Layout>
  );
}
