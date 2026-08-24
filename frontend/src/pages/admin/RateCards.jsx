import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { api } from "../../api/client";

const COMBOS = [
  { orderType: "B2C", zoneType: "INTRA", label: "B2C · Within same zone" },
  { orderType: "B2C", zoneType: "INTER", label: "B2C · Across zones" },
  { orderType: "B2B", zoneType: "INTRA", label: "B2B · Within same zone" },
  { orderType: "B2B", zoneType: "INTER", label: "B2B · Across zones" },
];

export default function RateCards() {
  const [rateCards, setRateCards] = useState([]);
  const [codSurcharges, setCodSurcharges] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({}); // keyed by "orderType-zoneType" -> {baseCharge, ratePerKg}
  const [codForm, setCodForm] = useState({}); // keyed by orderType -> {type, value}

  async function load() {
    try {
      const data = await api.get("/rate-cards");
      setRateCards(data.rateCards);
      setCodSurcharges(data.codSurcharges);

      const f = {};
      data.rateCards.forEach((rc) => { f[`${rc.orderType}-${rc.zoneType}`] = { baseCharge: rc.baseCharge, ratePerKg: rc.ratePerKg }; });
      setForm(f);

      const cf = {};
      data.codSurcharges.forEach((c) => { cf[c.orderType] = { type: c.type, value: c.value }; });
      setCodForm(cf);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  function updateField(key, field, value) {
    setForm((f) => ({ ...f, [key]: { ...f[key], [field]: value } }));
  }

  async function saveRateCard(orderType, zoneType) {
    const key = `${orderType}-${zoneType}`;
    const values = form[key] || {};
    setBusy(true); setError(""); setNotice("");
    try {
      await api.post("/rate-cards", {
        orderType, zoneType,
        baseCharge: Number(values.baseCharge) || 0,
        ratePerKg: Number(values.ratePerKg) || 0,
      });
      setNotice(`Saved rate for ${orderType} / ${zoneType}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function updateCod(orderType, field, value) {
    setCodForm((f) => ({ ...f, [orderType]: { ...f[orderType], [field]: value } }));
  }

  async function saveCod(orderType) {
    const values = codForm[orderType] || { type: "FLAT", value: 0 };
    setBusy(true); setError(""); setNotice("");
    try {
      await api.post("/rate-cards/cod-surcharge", { orderType, type: values.type, value: Number(values.value) || 0 });
      setNotice(`Saved COD surcharge for ${orderType}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title="Rate Cards" subtitle="Every charge on the platform is computed from these numbers — nothing is hardcoded">
      {error && <div className="banner banner-error">{error}</div>}
      {notice && <div className="banner banner-success">{notice}</div>}

      <div className="grid grid-2">
        {COMBOS.map(({ orderType, zoneType, label }) => {
          const key = `${orderType}-${zoneType}`;
          const values = form[key] || { baseCharge: "", ratePerKg: "" };
          return (
            <div className="card" key={key}>
              <div className="card-title">{label}</div>
              <div className="field-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="field">
                  <label>Base charge (₹)</label>
                  <input type="number" min="0" step="0.5" value={values.baseCharge} onChange={(e) => updateField(key, "baseCharge", e.target.value)} />
                </div>
                <div className="field">
                  <label>Rate per kg (₹)</label>
                  <input type="number" min="0" step="0.5" value={values.ratePerKg} onChange={(e) => updateField(key, "ratePerKg", e.target.value)} />
                </div>
              </div>
              <button className="btn btn-accent btn-sm" disabled={busy} onClick={() => saveRateCard(orderType, zoneType)}>Save</button>
            </div>
          );
        })}
      </div>

      <div className="divider" />
      <h3 style={{ fontSize: 16, marginBottom: 12 }}>COD surcharge rules</h3>
      <div className="grid grid-2">
        {["B2C", "B2B"].map((orderType) => {
          const values = codForm[orderType] || { type: "FLAT", value: "" };
          return (
            <div className="card" key={orderType}>
              <div className="card-title">{orderType}</div>
              <div className="field-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="field">
                  <label>Type</label>
                  <select value={values.type} onChange={(e) => updateCod(orderType, "type", e.target.value)}>
                    <option value="FLAT">Flat amount (₹)</option>
                    <option value="PERCENT">Percent of goods charge</option>
                  </select>
                </div>
                <div className="field">
                  <label>Value</label>
                  <input type="number" min="0" step="0.1" value={values.value} onChange={(e) => updateCod(orderType, "value", e.target.value)} />
                </div>
              </div>
              <button className="btn btn-accent btn-sm" disabled={busy} onClick={() => saveCod(orderType)}>Save</button>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
