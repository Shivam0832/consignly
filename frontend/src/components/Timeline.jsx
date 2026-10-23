import { Check, Circle, X, Truck } from "lucide-react";
import { TONE, label, when } from "../lib/orderStatus";

/** Newest first: the most recent event is what people look for. */
export default function Timeline({ history = [], showNotes = true }) {
  if (!history.length) return <p className="muted">No tracking events yet.</p>;
  const items = [...history].reverse();
  return (
    <ol className="timeline">
      {items.map((h, i) => {
        const tone = TONE[h.status];
        const cls = [i === 0 ? "is-latest" : "", tone === "ok" ? "is-ok" : "", tone === "bad" ? "is-bad" : ""].join(" ");
        const Icon = tone === "ok" ? Check : tone === "bad" ? X : tone === "move" ? Truck : Circle;
        return (
          <li key={h.id || `${h.status}-${h.createdAt}`} className={cls}>
            <span className="dot"><Icon aria-hidden="true" /></span>
            <div>
              <div className="what">{label(h.status)}</div>
              <div className="when">
                {when(h.createdAt)}{h.actorRole ? `, by ${h.actorRole.toLowerCase()}` : ""}
              </div>
              {showNotes && h.note && <div className="note">{h.note}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
