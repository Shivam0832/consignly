import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search, LogOut, Sun, Moon, Monitor, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../lib/theme";
import Brand from "./Brand";
import CommandPalette from "./CommandPalette";
import { NAV } from "./nav";

export { BrandMark } from "./Brand";

const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };
const THEME_NAME = { system: "Theme: match system", light: "Theme: light", dark: "Theme: dark" };

const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");

export default function Layout({ children, title, subtitle, actions, back }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, cycle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const links = NAV[user?.role] || [];
  const ThemeIcon = THEME_ICON[mode];

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => { if (title) document.title = `${title} · Consignly`; }, [title]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <div className="app">
      <header className="mobile-bar">
        <Brand to="/" />
        <div className="row">
          <button className="icon-btn-chrome" onClick={() => setPaletteOpen(true)} aria-label="Search"><Search /></button>
          <button className="icon-btn-chrome" onClick={() => setMenuOpen((o) => !o)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="sidebar">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <aside id="sidebar" className={`sidebar ${menuOpen ? "open" : ""}`}>
        <Brand to="/" />
        <nav className="nav" aria-label="Main">
          {links.map((l, i) =>
            l.group ? (
              <div key={`g${i}`} className="nav-group">{l.group}</div>
            ) : (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "active" : "")}>
                <l.icon aria-hidden="true" />
                {l.label}
              </NavLink>
            )
          )}
        </nav>
        <div className="me">
          <div className="avatar" aria-hidden="true">{initials(user?.name)}</div>
          <div className="me-text">
            <strong title={user?.email}>{user?.name}</strong>
            <span>{user?.role?.toLowerCase()}</span>
          </div>
          <button className="icon-btn-chrome mobile-only" onClick={cycle} aria-label={THEME_NAME[mode]} title={THEME_NAME[mode]}><ThemeIcon /></button>
          <button className="icon-btn-chrome" onClick={handleLogout} aria-label="Log out" title="Log out"><LogOut /></button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <button className="search-trigger" onClick={() => setPaletteOpen(true)}>
            <Search aria-hidden="true" />
            Find an order
            <span className="kbd">{isMac ? "⌘K" : "Ctrl K"}</span>
          </button>
          <span className="grow" />
          <button className="btn btn-quiet btn-icon btn-sm" onClick={cycle} aria-label={THEME_NAME[mode]} title={THEME_NAME[mode]}><ThemeIcon /></button>
          {user?.role === "CUSTOMER" && <Link to="/customer/new" className="btn btn-primary btn-sm">Book a delivery</Link>}
          {user?.role === "ADMIN" && <Link to="/admin/new-order" className="btn btn-ghost btn-sm">Book for a customer</Link>}
        </div>

        <main className="page">
          {back && (
            <Link to={back.to} className="back"><ArrowLeft aria-hidden="true" />{back.label}</Link>
          )}
          {title && (
            <div className="page-head">
              <div style={{ minWidth: 0 }}>
                <h1>{title}</h1>
                {subtitle && <p>{subtitle}</p>}
              </div>
              {actions && <div className="row wrap">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} role={user?.role} />
    </div>
  );
}
