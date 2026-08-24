export default function ManifestTrail({ history = [] }) {
  if (history.length === 0) {
    return <p className="text-soft" style={{ fontSize: 13.5 }}>No tracking events yet.</p>;
  }
  const lastIndex = history.length - 1;

  return (
    <div className="manifest-trail">
      {history.map((h, i) => (
        <div className="manifest-entry" key={h.id || i}>
          <div className={`manifest-stamp ${i === lastIndex ? "is-current" : ""}`}>
            <div className="manifest-stamp-dot" />
          </div>
          <div className="manifest-status">{h.status?.replace(/_/g, " ")}</div>
          <div className="manifest-meta">
            {new Date(h.createdAt).toLocaleString()} · {h.actorRole}
          </div>
          {h.note && <div className="manifest-note">{h.note}</div>}
        </div>
      ))}
    </div>
  );
}
