import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, CornerDownLeft } from "lucide-react";
import { api } from "../api/client";
import { NAV } from "./nav";
import { label } from "../lib/orderStatus";

/** Ctrl/⌘+K: jump to a page or find an order by its number. */
export default function CommandPalette({ open, onClose, role }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState([]);
  const [sel, setSel] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQ(""); setOrders([]); setSel(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open || q.trim().length < 2) { setOrders([]); return undefined; }
    const t = setTimeout(() => {
      api.get(`/orders?q=${encodeURIComponent(q.trim())}&limit=6`).then((d) => setOrders(d.orders)).catch(() => setOrders([]));
    }, 180);
    return () => clearTimeout(t);
  }, [q, open]);

  const pages = useMemo(
    () => (NAV[role] || []).filter((n) => n.to && n.label.toLowerCase().includes(q.trim().toLowerCase())),
    [role, q]
  );
  const items = [
    ...orders.map((o) => ({ key: o.id, to: `/orders/${o.id}`, icon: Package, title: o.orderNumber, sub: `${label(o.status)}, ${o.pickupZone?.name || "?"} to ${o.dropZone?.name || "?"}`, code: true })),
    ...pages.map((p) => ({ key: p.to, to: p.to, icon: p.icon, title: p.label })),
  ];

  function go(item) {
    if (!item) return;
    onClose();
    navigate(item.to);
  }

  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, items.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); go(items[sel]); }
    if (e.key === "Escape") onClose();
  }

  if (!open) return null;
  return (
    <div className="palette-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search">
        <div className="palette-input">
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={onKey}
            placeholder="Find an order number or go to a page"
            aria-label="Search orders and pages"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
          />
        </div>
        <ul id="palette-list" role="listbox">
          {orders.length > 0 && <li className="group" role="presentation">Orders</li>}
          {items.map((it, i) => (
            <li key={it.key} role="presentation">
              {i === orders.length && pages.length > 0 && <div className="group">Pages</div>}
              <button role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => go(it)}>
                <it.icon aria-hidden="true" />
                <span className="grow">
                  <span className={it.code ? "code" : ""} style={{ fontWeight: 600 }}>{it.title}</span>
                  {it.sub && <span className="muted" style={{ display: "block", fontSize: 12.5 }}>{it.sub}</span>}
                </span>
                {i === sel && <CornerDownLeft size={15} className="muted" aria-hidden="true" />}
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="group" role="presentation">{q.trim().length < 2 ? "Type at least 2 characters of an order number" : "No matches"}</li>}
        </ul>
        <div className="palette-foot"><span>↑↓ to move</span><span>Enter to open</span><span>Esc to close</span></div>
      </div>
    </div>
  );
}
