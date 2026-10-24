/** Empty state with a small parcel drawing. */
export default function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <svg className="art" viewBox="0 0 120 84" fill="none" aria-hidden="true">
        <path d="M18 30 60 12l42 18v34L60 82 18 64V30Z" fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M18 30 60 48l42-18M60 48v34" stroke="var(--line-strong)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M39 21 81 39v12" stroke="var(--tape)" strokeWidth="7" strokeLinejoin="round" />
      </svg>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
