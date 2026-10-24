import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Package, Box, Boxes, ArrowRight, Loader2, ReceiptText } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "./Toaster";
import { money, todayISO } from "../lib/orderStatus";

const PRESETS = [
  { key: "env", name: "Envelope", hint: "Documents", icon: Mail, dims: [33, 23, 2], kg: 0.3 },
  { key: "sm", name: "Small box", hint: "Up to 1 kg", icon: Package, dims: [20, 15, 10], kg: 1 },
  { key: "md", name: "Medium box", hint: "Up to 3 kg", icon: Box, dims: [30, 25, 20], kg: 3 },
  { key: "lg", name: "Large box", hint: "Up to 8 kg", icon: Boxes, dims: [50, 40, 30], kg: 8 },
];

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

const PIN = { inputMode: "numeric", pattern: "\\d{6}", maxLength: 6, title: "6-digit pincode", autoComplete: "postal-code" };
const quotable = (f) =>
  /^\d{6}$/.test(f.pickupPincode) && /^\d{6}$/.test(f.dropPincode) &&
  [f.lengthCm, f.breadthCm, f.heightCm, f.actualWeightKg].every((v) => Number(v) > 0);

/**
 * Booking form with a live quote: the price recalculates as soon as both
 * pincodes and the package size are filled in, so there's no separate
 * "get quote" step before confirming.
 */
export default function OrderForm({ asAdmin = false }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(initialForm);
  const [preset, setPreset] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoAssign, setAutoAssign] = useState(true);
  const seq = useRef(0);

  const set = (k) => (e) => {
    const v = k.endsWith("Pincode") ? e.target.value.replace(/\D/g, "") : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (["lengthCm", "breadthCm", "heightCm", "actualWeightKg"].includes(k)) setPreset(null);
  };

  function applyPreset(p) {
    setPreset(p.key);
    setForm((f) => ({ ...f, lengthCm: String(p.dims[0]), breadthCm: String(p.dims[1]), heightCm: String(p.dims[2]), actualWeightKg: String(p.kg) }));
  }

  // Live quote, debounced; ignores stale responses.
  const quoteKey = [form.pickupPincode, form.dropPincode, form.lengthCm, form.breadthCm, form.heightCm, form.actualWeightKg, form.orderType, form.paymentType].join("|");
  useEffect(() => {
    if (!quotable(form)) { setQuote(null); setQuoteError(""); return undefined; }
    const id = ++seq.current;
    setQuoting(true);
    const t = setTimeout(async () => {
      try {
        const data = await api.post("/orders/calculate", {
          pickupPincode: form.pickupPincode, dropPincode: form.dropPincode,
          lengthCm: Number(form.lengthCm), breadthCm: Number(form.breadthCm), heightCm: Number(form.heightCm),
          actualWeightKg: Number(form.actualWeightKg), orderType: form.orderType, paymentType: form.paymentType,
        });
        if (id === seq.current) { setQuote(data.quote); setQuoteError(""); }
      } catch (err) {
        if (id === seq.current) { setQuote(null); setQuoteError(err.message); }
      } finally {
        if (id === seq.current) setQuoting(false);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!quote) { setError("Fill in both pincodes and the package size to see the price first."); return; }
    setBusy(true);
    try {
      const payload = { ...form, autoAssign: asAdmin && autoAssign };
      if (!asAdmin) delete payload.customerEmail;
      const data = await api.post("/orders", payload);
      const a = data.assignment;
      toast(a ? (a.assigned ? `Booked and assigned to ${a.agentName}.` : "Booked. No agent is free yet.") : `Booked: ${data.order.orderNumber}`);
      navigate(`/orders/${data.order.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="layout-main-side" onSubmit={handleSubmit} noValidate={false}>
      <div className="stack">
        {error && <div className="notice notice-bad" role="alert">{error}</div>}

        {asAdmin && (
          <section className="card">
            <h2 className="section-title">Customer</h2>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="f-cust">Customer's account email</label>
              <input id="f-cust" type="email" value={form.customerEmail} onChange={set("customerEmail")} placeholder="name@example.com" required />
            </div>
          </section>
        )}

        <section className="card">
          <h2 className="section-title"><span className="num">1</span>Where it's going</h2>
          <div className="grid-fields">
            <div className="field">
              <label htmlFor="f-paddr">Pickup address</label>
              <textarea id="f-paddr" rows={2} value={form.pickupAddress} onChange={set("pickupAddress")} autoComplete="street-address" required />
            </div>
            <div className="field">
              <label htmlFor="f-daddr">Delivery address</label>
              <textarea id="f-daddr" rows={2} value={form.dropAddress} onChange={set("dropAddress")} required />
            </div>
            <div className="field">
              <label htmlFor="f-ppin">Pickup pincode</label>
              <input id="f-ppin" className="input-code" {...PIN} value={form.pickupPincode} onChange={set("pickupPincode")} placeholder="110001" required />
            </div>
            <div className="field">
              <label htmlFor="f-dpin">Delivery pincode</label>
              <input id="f-dpin" className="input-code" {...PIN} value={form.dropPincode} onChange={set("dropPincode")} placeholder="560001" required />
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="section-title"><span className="num">2</span>What you're sending</h2>
          <div className="presets" role="group" aria-label="Package size presets">
            {PRESETS.map((p) => (
              <button type="button" key={p.key} className="preset" aria-pressed={preset === p.key} onClick={() => applyPreset(p)}>
                <p.icon aria-hidden="true" />
                <strong>{p.name}</strong>
                <span>{p.hint}</span>
              </button>
            ))}
          </div>
          <fieldset className="field">
            <legend>Size in cm (length, breadth, height)</legend>
            <div className="grid-fields-3">
              <input className="input" type="number" min="0.1" step="0.1" inputMode="decimal" value={form.lengthCm} onChange={set("lengthCm")} placeholder="Length" aria-label="Length in cm" required />
              <input className="input" type="number" min="0.1" step="0.1" inputMode="decimal" value={form.breadthCm} onChange={set("breadthCm")} placeholder="Breadth" aria-label="Breadth in cm" required />
              <input className="input" type="number" min="0.1" step="0.1" inputMode="decimal" value={form.heightCm} onChange={set("heightCm")} placeholder="Height" aria-label="Height in cm" required />
            </div>
          </fieldset>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="f-wt">Weight (kg)</label>
            <input id="f-wt" type="number" min="0.01" step="0.01" inputMode="decimal" value={form.actualWeightKg} onChange={set("actualWeightKg")} required />
            <span className="hint">We charge the higher of actual weight and size-based weight (L×B×H ÷ 5000).</span>
          </div>
        </section>

        <section className="card">
          <h2 className="section-title"><span className="num">3</span>How you'll pay</h2>
          <div className="grid-fields">
            <fieldset className="field">
              <legend>Shipment type</legend>
              <div className="seg">
                <label><input type="radio" name="otype" value="B2C" checked={form.orderType === "B2C"} onChange={set("orderType")} /><span>Personal<small>B2C</small></span></label>
                <label><input type="radio" name="otype" value="B2B" checked={form.orderType === "B2B"} onChange={set("orderType")} /><span>Business<small>B2B</small></span></label>
              </div>
            </fieldset>
            <fieldset className="field">
              <legend>Payment</legend>
              <div className="seg">
                <label><input type="radio" name="ptype" value="PREPAID" checked={form.paymentType === "PREPAID"} onChange={set("paymentType")} /><span>Prepaid</span></label>
                <label><input type="radio" name="ptype" value="COD" checked={form.paymentType === "COD"} onChange={set("paymentType")} /><span>Cash on delivery</span></label>
              </div>
            </fieldset>
          </div>
          <div className="field" style={{ marginBottom: asAdmin ? undefined : 0 }}>
            <label htmlFor="f-date">Preferred delivery date (optional)</label>
            <input id="f-date" type="date" min={todayISO()} value={form.scheduledDate} onChange={set("scheduledDate")} />
          </div>
          {asAdmin && (
            <label className="check" style={{ marginBottom: 0 }}>
              <input type="checkbox" checked={autoAssign} onChange={(e) => setAutoAssign(e.target.checked)} />
              Assign the best available agent right away
            </label>
          )}
        </section>
      </div>

      <aside className="card quote" aria-live="polite" aria-busy={quoting}>
        <div className="card-head">
          <h2>Price</h2>
          {quoting && <Loader2 size={16} className="spin muted" aria-label="Updating price" />}
        </div>
        {!quote ? (
          <div className="quote-empty">
            <ReceiptText aria-hidden="true" />
            {quoteError ? <span style={{ color: "var(--bad)" }}>{quoteError}</span> : <span>Add both pincodes and the package size, and the price appears here.</span>}
          </div>
        ) : (
          <>
            <div className="quote-route">
              <span>{form.pickupPincode}</span><ArrowRight aria-hidden="true" /><span>{form.dropPincode}</span>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              {quote.pickupZone.name} to {quote.dropZone.name}, {quote.zoneType === "INTRA" ? "same zone" : "across zones"}
            </p>
            <div className="ledger">
              <div className="line"><span>Base charge</span><span>{money(quote.baseCharge)}</span></div>
              <div className="line"><span>{quote.billableWeightKg} kg at {money(quote.rateCard.ratePerKg)}/kg</span><span>{money(quote.weightCharge)}</span></div>
              {quote.codSurcharge > 0 && <div className="line"><span>Cash on delivery fee</span><span>{money(quote.codSurcharge)}</span></div>}
              <div className="total"><span>Total</span><strong>{money(quote.totalCharge)}</strong></div>
            </div>
            {quote.volumetricWeightKg > Number(form.actualWeightKg) && (
              <p className="hint" style={{ marginTop: 10 }}>Charged on size: the box is bulky for its weight ({quote.volumetricWeightKg} kg by size).</p>
            )}
          </>
        )}
        <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 20 }} type="submit" disabled={busy || !quote || quoting}>
          {busy ? "Booking…" : quote ? `Book for ${money(quote.totalCharge)}` : "Book delivery"}
        </button>
      </aside>
    </form>
  );
}
