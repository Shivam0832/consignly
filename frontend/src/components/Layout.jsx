import { NavLink, useNavigate } from "react-router-dom";
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

export default function Layout({ children, title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = NAV[user?.role] || [];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-mark">
            <svg width="16" height="16" viewBox="0 0 100 100" fill="none">
              <path d="M20 65 L50 30 L80 65" stroke="#0d1526" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Consignly
        </div>
        <nav className="sidebar-nav">
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
            {user?.email}
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
          </div>
        )}
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
