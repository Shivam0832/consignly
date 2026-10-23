import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = {
  CUSTOMER: [
    { to: "/customer", label: "My Orders", end: true },
    { to: "/customer/new", label: "Place an Order" },
  ],
  AGENT: [
    { to: "/agent", label: "My Deliveries", end: true },
  ],
  ADMIN: [
    { to: "/admin", label: "Overview", end: true },
    { to: "/admin/orders", label: "All Orders" },
    { to: "/admin/zones", label: "Zones & Areas" },
    { to: "/admin/rates", label: "Rate Cards" },
    { to: "/admin/agents", label: "Agents" },
    { to: "/admin/new-order", label: "Create Order" },
  ],
};

export function BrandMark({ size = 30 }) {
  return (
    <span className="sidebar-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 100 100" fill="none">
        <path d="M20 65 L50 30 L80 65" stroke="#0d1526" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function Layout({ children, title, subtitle, actions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = NAV[user?.role] || [];

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (title) document.title = `${title} · Consignly`;
  }, [title]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="mobile-bar">
        <div className="sidebar-brand" style={{ margin: 0 }}>
          <BrandMark />
          Consignly
        </div>
        <button
          className="menu-btn"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" />
            )}
          </svg>
        </button>
      </header>

      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <aside id="app-sidebar" className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <BrandMark />
          Consignly
        </div>
        <nav className="sidebar-nav" aria-label="Main">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-user">
            <strong>{user?.name}</strong>
            <span className="sidebar-email">{user?.email}</span>
            <div className="role-chip">{user?.role}</div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Log out</button>
        </div>
      </aside>

      <div className="main-area">
        {title && (
          <div className="topbar">
            <div>
              <h1>{title}</h1>
              {subtitle && <div className="topbar-sub">{subtitle}</div>}
            </div>
            {actions && <div className="topbar-actions">{actions}</div>}
          </div>
        )}
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
