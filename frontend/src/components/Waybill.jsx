import { Truck, PackageCheck, PackageX } from "lucide-react";
import { DELIVERY_STEPS, headline, label, progress, when } from "../lib/orderStatus";

const short = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
import StatusBadge from "./StatusBadge";

/** Deterministic barcode-style bars from the order number (decorative). */
function Barcode({ value }) {
  const bars = [];
  let x = 0;
  for (let i = 0; i < value.length && x < 150; i++) {
    const c = value.charCodeAt(i);
    for (const w of [1 + (c % 3), 1 + ((c >> 2) % 2), 2 + ((c >> 1) % 2)]) {
      bars.push(<rect key={`${i}-${x}`} x={x} y="0" width={w} height="28" fill="currentColor" />);
      x += w + 1 + ((c >> 3) % 2);
    }
  }
  return (
    <svg className="barcode" viewBox={`0 0 ${Math.max(x, 1)} 28`} preserveAspectRatio="none" aria-hidden="true">
      {bars}
    </svg>
  );
}

/**
 * The waybill: order number on a tape strip, the route set large, a truck
 * that sits where the parcel actually is, and the step-by-step progress.
 * Works for full orders and the public tracking payload.
 */
export default function Waybill({ order, from, to }) {
  const history = order.trackingHistory || [];
  const p = progress(order.status, history);
  const tone = order.status === "DELIVERED" ? "is-ok" : ["FAILED", "CANCELLED"].includes(order.status) ? "is-bad" : "";
  const Icon = order.status === "DELIVERED" ? PackageCheck : tone === "is-bad" ? PackageX : Truck;

  const reachedAt = {};
  history.forEach((h) => { reachedAt[h.status] = h.createdAt; });
  const currentIndex = DELIVERY_STEPS.indexOf(order.status);
  const reachedIndex = Math.max(-1, ...history.map((h) => DELIVERY_STEPS.indexOf(h.status)));
  const halted = ["FAILED", "CANCELLED"].includes(order.status);
  const last = history[history.length - 1];

  return (
    <section className="waybill" aria-label={`Waybill ${order.orderNumber}`}>
      <div className="waybill-strip">
        <span className="code">{order.orderNumber}</span>
        <Barcode value={order.orderNumber} />
      </div>

      <div className="waybill-route">
        <div className="route-end from">
          <div className="pin">{order.pickupPincode}</div>
          <div className="zone">{order.pickupZone?.name || "Unmapped zone"}</div>
          {from && <div className="where">{from}</div>}
        </div>
        <div className={`route-line ${tone}`} role="img" aria-label={`${Math.round(p * 100)}% of the way`}>
          <span className="done" style={{ width: `${p * 100}%` }} />
          <span className="truck" style={{ left: `${p * 100}%` }}><Icon aria-hidden="true" /></span>
        </div>
        <div className="route-end to">
          <div className="pin">{order.dropPincode}</div>
          <div className="zone">{order.dropZone?.name || "Unmapped zone"}</div>
          {to && <div className="where">{to}</div>}
        </div>
      </div>

      <div className="waybill-status">
        <div>
          <div className="now">{headline(order.status)}</div>
          {last && <div className="sub">Updated {when(last.createdAt)}</div>}
        </div>
        <StatusBadge status={order.status} />
      </div>

      <ol className="steps" aria-label="Delivery steps">
        {DELIVERY_STEPS.map((s, i) => {
          let cls = i <= reachedIndex ? "done" : "";
          if (i === currentIndex) cls = "current";
          if (halted && i === Math.max(0, reachedIndex)) cls = "halted";
          if (order.status === "RESCHEDULED" && i === 0) cls = "current";
          return (
            <li key={s} className={cls} aria-current={cls === "current" ? "step" : undefined}>
              {label(s)}
              {reachedAt[s] && <time dateTime={reachedAt[s]} title={when(reachedAt[s])}>{short(reachedAt[s])}</time>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
