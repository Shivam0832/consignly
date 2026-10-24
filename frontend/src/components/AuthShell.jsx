import Brand from "./Brand";

/** Split-screen auth layout. The left panel draws a delivery route once on load. */
export default function AuthShell({ children }) {
  return (
    <div className="auth">
      <aside className="auth-art">
        <Brand to="/" />
        <div>
          <svg className="route-art" viewBox="0 0 520 220" aria-hidden="true">
            <path className="path" d="M40 170 C 140 170, 120 60, 230 70 S 360 170, 480 50" />
            <path className="path-live" d="M40 170 C 140 170, 120 60, 230 70 S 360 170, 480 50" />
            <circle className="stop" cx="40" cy="170" r="8" />
            <circle className="stop" cx="230" cy="70" r="6" />
            <circle className="stop-end" cx="480" cy="50" r="10" />
            <text x="22" y="200">110001</text>
            <text x="440" y="26">560001</text>
          </svg>
          <h2>From pickup to doorstep, one clear line.</h2>
          <p>Book, dispatch and track every parcel in one place, with a record of every step.</p>
        </div>
        <span style={{ fontSize: 13, color: "#7d84a0" }}>Consignly</span>
      </aside>
      <main className="auth-form">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
