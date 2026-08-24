import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

const initialForm = {
  customerEmail: "",
  pickupAddress: "",
  pickupPincode: "",
  dropAddress: "",
  dropPincode: "",
  lengthCm: "",
  breadthCm: "",
  heightCm: "",
  actualWeightKg: "",
  orderType: "B2C",
  paymentType: "PREPAID",
  scheduledDate: "",
};

/**
 * asAdmin=true renders the "customer email" field and lets an admin place an
 * order on behalf of any registered customer. Both flows quote a price via
 * /orders/calculate and only create the order after the user confirms —
 * satisfying "the charge is shown before the customer confirms".
 */
export default function OrderForm({ asAdmin = false }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoAssign, setAutoAssign] = useState(true);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setQuote(null); // any change invalidates the previous quote
  }

  async function handleQuote(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api.post("/orders/calculate", {
        pickupPincode: form.pickupPincode,
        dropPincode: form.dropPincode,
        lengthCm: Number(form.lengthCm),
        breadthCm: Number(form.breadthCm),
        heightCm: Number(form.heightCm),
        actualWeightKg: Number(form.actualWeightKg),
        orderType: form.orderType,
        paymentType: form.paymentType,
      });
      setQuote(data.quote);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    setError("");
    setBusy(true);
    try {
      const payload = { ...form, autoAssign };
      if (asAdmin && !form.customerEmail) {
        setError("Customer email is required");
        setBusy(false);
        return;
      }
      const data = await api.post("/orders", payload);
      navigate(`/orders/${data.order.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-2" style={{ alignItems: "start" }}>
      <form className="card" onSubmit={handleQuote}>
        {error && <div className="banner banner-error">{error}</div>}

        {asAdmin && (
          <div className="field">
            <label>Customer email</label>
            <input type="email" value={form.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} placeholder="customer@example.com" required />
          </div>
        )}

        <div className="field">
          <label>Pickup address</label>
          <textarea rows={2} value={form.pickupAddress} onChange={(e) => set("pickupAddress", e.target.value)} required />
        </div>
        <div className="field">
          <label>Pickup pincode</label>
          <input value={form.pickupPincode} onChange={(e) => set("pickupPincode", e.target.value)} placeholder="110001" required />
        </div>

        <div className="field">
          <label>Drop address</label>
          <textarea rows={2} value={form.dropAddress} onChange={(e) => set("dropAddress", e.target.value)} required />
        </div>
        <div className="field">
          <label>Drop pincode</label>
          <input value={form.dropPincode} onChange={(e) => set("dropPincode", e.target.value)} placeholder="560001" required />
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--paper-ink-soft)" }}>Package dimensions (cm) &amp; weight (kg)</label>
        <div className="field-row" style={{ marginTop: 6, marginBottom: 16 }}>
          <input type="number" min="0.1" step="0.1" value={form.lengthCm} onChange={(e) => set("lengthCm", e.target.value)} placeholder="Length" required />
          <input type="number" min="0.1" step="0.1" value={form.breadthCm} onChange={(e) => set("breadthCm", e.target.value)} placeholder="Breadth" required />
          <input type="number" min="0.1" step="0.1" value={form.heightCm} onChange={(e) => set("heightCm", e.target.value)} placeholder="Height" required />
        </div>
        <div className="field">
          <label>Actual weight (kg)</label>
          <input type="number" min="0.01" step="0.01" value={form.actualWeightKg} onChange={(e) => set("actualWeightKg", e.target.value)} required />
        </div>

        <div className="field-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label>Order type</label>
            <select value={form.orderType} onChange={(e) => set("orderType", e.target.value)}>
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
            </select>
          </div>
          <div className="field">
            <label>Payment type</label>
            <select value={form.paymentType} onChange={(e) => set("paymentType", e.target.value)}>
              <option value="PREPAID">Prepaid</option>
              <option value="COD">Cash on Delivery</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Preferred delivery date (optional)</label>
          <input type="date" value={form.scheduledDate} onChange={(e) => set("scheduledDate", e.target.value)} />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, marginBottom: 16 }}>
          <input type="checkbox" checked={autoAssign} onChange={(e) => setAutoAssign(e.target.checked)} style={{ width: "auto" }} />
          Auto-assign nearest available agent immediately
        </label>

        <button className="btn btn-ghost btn-block" type="submit" disabled={busy}>
          {busy ? "Calculating…" : "Get price quote"}
        </button>
      </form>

      <div className="card">
        <div className="card-title">Price breakdown</div>
        {!quote ? (
          <p className="text-soft" style={{ fontSize: 13.5 }}>Fill in the form and click "Get price quote" to see the charge before placing the order.</p>
        ) : (
          <>
            <div className="grid grid-2" style={{ fontSize: 13, marginBottom: 14 }}>
              <div><div className="stat-label">Pickup zone</div><p style={{ marginTop: 4 }}>{quote.pickupZone.name}</p></div>
              <div><div className="stat-label">Drop zone</div><p style={{ marginTop: 4 }}>{quote.dropZone.name}</p></div>
              <div><div className="stat-label">Zone type</div><p style={{ marginTop: 4 }}>{quote.zoneType}</p></div>
              <div><div className="stat-label">Billable weight</div><p style={{ marginTop: 4 }}>{quote.billableWeightKg} kg (volumetric: {quote.volumetricWeightKg} kg)</p></div>
            </div>
            <div className="divider" />
            <div className="flex-between" style={{ fontSize: 13.5 }}>
              <span className="text-soft">Base charge</span><span className="mono">₹{quote.baseCharge}</span>
            </div>
            <div className="flex-between" style={{ fontSize: 13.5, marginTop: 6 }}>
              <span className="text-soft">Weight charge (₹{quote.rateCard.ratePerKg}/kg)</span><span className="mono">₹{quote.weightCharge}</span>
            </div>
            {quote.codSurcharge > 0 && (
              <div className="flex-between" style={{ fontSize: 13.5, marginTop: 6 }}>
                <span className="text-soft">COD surcharge</span><span className="mono">₹{quote.codSurcharge}</span>
              </div>
            )}
            <div className="flex-between" style={{ fontSize: 17, marginTop: 12, fontWeight: 700 }}>
              <span>Total</span><span className="mono">₹{quote.totalCharge}</span>
            </div>

            <button className="btn btn-accent btn-block" style={{ marginTop: 20 }} disabled={busy} onClick={handleConfirm}>
              {busy ? "Placing order…" : "Confirm & place order"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
