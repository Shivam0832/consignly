import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { money, todayISO } from "../lib/orderStatus";

const PINCODE_PROPS = { inputMode: "numeric", pattern: "\\d{6}", maxLength: 6, title: "6-digit pincode" };

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
  const [autoAssign, setAutoAssign] = useState(true); // admins only

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
      if (asAdmin && !form.customerEmail) {
        setError("Customer email is required");
        return;
      }
      const payload = { ...form, autoAssign: asAdmin && autoAssign };
      if (!asAdmin) delete payload.customerEmail;
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
        {error && <div className="banner banner-error" role="alert">{error}</div>}

        {asAdmin && (
          <div className="field">
            <label htmlFor="f-cust">Customer email</label>
            <input id="f-cust" type="email" value={form.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} placeholder="customer@example.com" required />
          </div>
        )}

        <div className="field">
          <label htmlFor="f-paddr">Pickup address</label>
          <textarea id="f-paddr" rows={2} value={form.pickupAddress} onChange={(e) => set("pickupAddress", e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="f-ppin">Pickup pincode</label>
          <input id="f-ppin" {...PINCODE_PROPS} value={form.pickupPincode} onChange={(e) => set("pickupPincode", e.target.value.replace(/\D/g, ""))} placeholder="6 digits, e.g. 110001" required />
        </div>

        <div className="field">
          <label htmlFor="f-daddr">Drop address</label>
          <textarea id="f-daddr" rows={2} value={form.dropAddress} onChange={(e) => set("dropAddress", e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="f-dpin">Drop pincode</label>
          <input id="f-dpin" {...PINCODE_PROPS} value={form.dropPincode} onChange={(e) => set("dropPincode", e.target.value.replace(/\D/g, ""))} placeholder="6 digits, e.g. 560001" required />
        </div>

        <fieldset className="field">
          <legend>Package dimensions (cm)</legend>
          <div className="field-row">
            <input type="number" min="0.1" step="0.1" inputMode="decimal" value={form.lengthCm} onChange={(e) => set("lengthCm", e.target.value)} placeholder="Length" aria-label="Length in cm" required />
            <input type="number" min="0.1" step="0.1" inputMode="decimal" value={form.breadthCm} onChange={(e) => set("breadthCm", e.target.value)} placeholder="Breadth" aria-label="Breadth in cm" required />
            <input type="number" min="0.1" step="0.1" inputMode="decimal" value={form.heightCm} onChange={(e) => set("heightCm", e.target.value)} placeholder="Height" aria-label="Height in cm" required />
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="f-wt">Actual weight (kg)</label>
          <input id="f-wt" type="number" min="0.01" step="0.01" value={form.actualWeightKg} onChange={(e) => set("actualWeightKg", e.target.value)} required />
        </div>

        <div className="field-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label htmlFor="f-otype">Order type</label>
            <select id="f-otype" value={form.orderType} onChange={(e) => set("orderType", e.target.value)}>
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-ptype">Payment type</label>
            <select id="f-ptype" value={form.paymentType} onChange={(e) => set("paymentType", e.target.value)}>
              <option value="PREPAID">Prepaid</option>
              <option value="COD">Cash on Delivery</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="f-date">Preferred delivery date (optional)</label>
          <input id="f-date" type="date" min={todayISO()} value={form.scheduledDate} onChange={(e) => set("scheduledDate", e.target.value)} />
        </div>

        {asAdmin && (
          <label className="check-row">
            <input type="checkbox" checked={autoAssign} onChange={(e) => setAutoAssign(e.target.checked)} />
            Auto-assign the best available agent right away
          </label>
        )}

        <button className="btn btn-ghost btn-block" type="submit" disabled={busy}>
          {busy ? "Calculating…" : "Get price quote"}
        </button>
      </form>

      <div className="card quote-card" aria-live="polite">
        <div className="card-title">Price breakdown</div>
        {!quote ? (
          <p className="text-soft" style={{ fontSize: 13.5 }}>Fill in the form and click "Get price quote" to see the charge before placing the order.</p>
        ) : (
          <>
            <div className="grid grid-2" style={{ fontSize: 13, marginBottom: 14 }}>
              <div><div className="stat-label">Pickup zone</div><p style={{ marginTop: 4 }}>{quote.pickupZone.name}</p></div>
              <div><div className="stat-label">Drop zone</div><p style={{ marginTop: 4 }}>{quote.dropZone.name}</p></div>
              <div><div className="stat-label">Zone type</div><p style={{ marginTop: 4 }}>{quote.zoneType === "INTRA" ? "Same zone" : "Across zones"}</p></div>
              <div><div className="stat-label">Billable weight</div><p style={{ marginTop: 4 }}>{quote.billableWeightKg} kg (volumetric: {quote.volumetricWeightKg} kg)</p></div>
            </div>
            <div className="divider" />
            <div className="flex-between" style={{ fontSize: 13.5 }}>
              <span className="text-soft">Base charge</span><span className="mono">{money(quote.baseCharge)}</span>
            </div>
            <div className="flex-between" style={{ fontSize: 13.5, marginTop: 6 }}>
              <span className="text-soft">Weight charge ({money(quote.rateCard.ratePerKg)}/kg)</span><span className="mono">{money(quote.weightCharge)}</span>
            </div>
            {quote.codSurcharge > 0 && (
              <div className="flex-between" style={{ fontSize: 13.5, marginTop: 6 }}>
                <span className="text-soft">COD surcharge</span><span className="mono">{money(quote.codSurcharge)}</span>
              </div>
            )}
            <div className="flex-between" style={{ fontSize: 17, marginTop: 12, fontWeight: 700 }}>
              <span>Total</span><span className="mono">{money(quote.totalCharge)}</span>
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
