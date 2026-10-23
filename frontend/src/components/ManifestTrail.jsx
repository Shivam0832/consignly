import { label } from "../lib/orderStatus";

export default function ManifestTrail({ history = [] }) {
  if (history.length === 0) {
    return <p className="text-soft" style={{ fontSize: 13.5 }}>No tracking events yet.</p>;
  }
  const lastIndex = history.length - 1;

  return (
    <ol className="manifest-trail">
      {history.map((h, i) => (
        <li className="manifest-entry" key={h.id || i}>
          <div className={`manifest-stamp ${i === lastIndex ? "is-current" : ""}`}>
            <div className="manifest-stamp-dot" />
          </div>
          <div className="manifest-status">{label(h.status)}</div>
          <div className="manifest-meta">
            {new Date(h.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · {h.actorRole.toLowerCase()}
          </div>
          {h.note && <div className="manifest-note">{h.note}</div>}
        </li>
      ))}
    </ol>
  );
}
