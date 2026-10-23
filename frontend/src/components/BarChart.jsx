import { useState } from "react";
import { money } from "../lib/orderStatus";

/** 14-day bar chart of orders per day; hover/focus a bar for its numbers. */
export default function BarChart({ data = [] }) {
  const [active, setActive] = useState(data.length - 1);
  const W = 560, H = 180, PAD_B = 22, PAD_T = 10;
  const max = Math.max(1, ...data.map((d) => d.orders));
  const step = W / Math.max(1, data.length);
  const bw = Math.min(26, step * 0.62);
  const ticks = [0, Math.ceil(max / 2), max];
  const sel = data[active];
  const fmt = (iso, opts) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", ...opts });

  return (
    <div>
      {sel && (
        <div className="row-between" style={{ marginBottom: 8 }}>
          <span className="muted" style={{ fontSize: 13 }}>{fmt(sel.date, { weekday: "short", day: "numeric", month: "short" })}</span>
          <span style={{ fontSize: 13 }}><strong>{sel.orders}</strong> order{sel.orders === 1 ? "" : "s"}, <strong>{money(sel.revenue)}</strong></span>
        </div>
      )}
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Orders per day, last 14 days">
        {ticks.map((t) => {
          const y = PAD_T + (H - PAD_B - PAD_T) * (1 - t / max);
          return <line key={t} className="grid" x1="0" x2={W} y1={y} y2={y} />;
        })}
        {data.map((d, i) => {
          const h = ((H - PAD_B - PAD_T) * d.orders) / max;
          const x = i * step + (step - bw) / 2;
          return (
            <g key={d.date}>
              <rect
                className={`bar ${i === data.length - 1 ? "is-today" : ""}`}
                x={x} y={H - PAD_B - Math.max(h, 2)} width={bw} height={Math.max(h, 2)} rx="5"
                tabIndex={0}
                onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)}
                aria-label={`${fmt(d.date, { day: "numeric", month: "short" })}: ${d.orders} orders`}
              />
              {(i % 2 === 1 || i === data.length - 1) && (
                <text className="axis" x={x + bw / 2} y={H - 6} textAnchor="middle">{fmt(d.date, { day: "numeric" })}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
