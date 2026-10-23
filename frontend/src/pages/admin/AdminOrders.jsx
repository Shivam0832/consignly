import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import Layout from "../../components/Layout";
import StatusBadge from "../../components/StatusBadge";
import RouteCell from "../../components/RouteCell";
import Empty from "../../components/Empty";
import useRowLink from "../../components/useRowLink";
import { api } from "../../api/client";
import { ALL_STATUSES, label, money, relative } from "../../lib/orderStatus";

const PAGE = 50;
const KEYS = ["status", "zoneId", "agentId", "orderType", "q"];

export default function AdminOrders() {
  const rowLink = useRowLink();
  const [params, setParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [zones, setZones] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(params.get("q") || "");

  const filters = Object.fromEntries(KEYS.map((k) => [k, params.get(k) || ""]));
  const key = KEYS.map((k) => filters[k]).join("|");
  const any = KEYS.some((k) => filters[k]);

  function setFilter(k, v) {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  }

  useEffect(() => {
    api.get("/zones").then((d) => setZones(d.zones)).catch(() => {});
    api.get("/admin/users?role=AGENT").then((d) => setAgents(d.users)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if ((params.get("q") || "") !== search.trim()) setFilter("q", search.trim()); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function load(offset = 0) {
    setLoading(true);
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    qs.set("limit", PAGE); qs.set("offset", offset);
    try {
      const data = await api.get(`/orders?${qs}`);
      setOrders((prev) => (offset ? [...prev, ...data.orders] : data.orders));
      setTotal(data.total ?? data.orders.length);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(0); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);

  return (
    <Layout title="Orders" subtitle={loading && !orders.length ? "Loading…" : `${total} order${total === 1 ? "" : "s"}${any ? " match your filters" : ""}`}>
      {error && <div className="notice notice-bad" role="alert">{error}</div>}

      <div className="filters">
        <div className="field">
          <label htmlFor="order-search">Order number</label>
          <div style={{ position: "relative" }}>
            <Search size={16} className="muted" style={{ position: "absolute", left: 12, top: 13 }} aria-hidden="true" />
            <input id="order-search" type="search" className="input input-code" style={{ paddingLeft: 36 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="LM-…" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="f-status">Status</label>
          <select id="f-status" value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="">Any status</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-zone">Zone</label>
          <select id="f-zone" value={filters.zoneId} onChange={(e) => setFilter("zoneId", e.target.value)}>
            <option value="">Any zone</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-agent">Agent</label>
          <select id="f-agent" value={filters.agentId} onChange={(e) => setFilter("agentId", e.target.value)}>
            <option value="">Any agent</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-type">Type</label>
          <select id="f-type" value={filters.orderType} onChange={(e) => setFilter("orderType", e.target.value)}>
            <option value="">Any type</option>
            <option value="B2C">Personal (B2C)</option>
            <option value="B2B">Business (B2B)</option>
          </select>
        </div>
      </div>
      {any && (
        <button className="btn btn-quiet btn-sm" style={{ marginBottom: 12 }} onClick={() => { setSearch(""); setParams({}, { replace: true }); }}>
          <X aria-hidden="true" />Clear filters
        </button>
      )}

      <div className="card card-flush">
        {!loading && orders.length === 0 ? (
          <Empty title="No orders match">Try a different status or clear the filters.</Empty>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Order</th><th>Customer</th><th>Route</th><th>Agent</th><th>Status</th><th className="num">Charge</th></tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} {...rowLink(`/orders/${o.id}`)}>
                      <td><div className="cell-main code">{o.orderNumber}</div><div className="cell-sub">{relative(o.createdAt)}, {o.orderType}</div></td>
                      <td>{o.customer?.name}</td>
                      <td><RouteCell order={o} /></td>
                      <td>{o.assignedAgent?.name || <span className="muted">Unassigned</span>}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="num cell-main">{money(o.totalCharge)}</td>
                    </tr>
                  ))}
                  {loading && orders.length === 0 && [0, 1, 2].map((i) => <tr key={i}><td colSpan={6}><div className="skeleton" style={{ height: 20 }} /></td></tr>)}
                </tbody>
              </table>
            </div>
            {orders.length < total && (
              <div className="pager">
                <button className="btn btn-ghost" disabled={loading} onClick={() => load(orders.length)}>{loading ? "Loading…" : `Show more (${total - orders.length} left)`}</button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
