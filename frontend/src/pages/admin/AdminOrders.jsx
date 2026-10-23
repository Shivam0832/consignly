import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "../../components/Layout";
import StatusBadge from "../../components/StatusBadge";
import useRowLink from "../../components/useRowLink";
import { api } from "../../api/client";
import { ALL_STATUSES, label, money } from "../../lib/orderStatus";

const PAGE = 50;
const FILTER_KEYS = ["status", "zoneId", "agentId", "orderType", "q"];

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

  // Filters live in the URL so they survive refresh and can be linked to.
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ""]));
  const filterKey = FILTER_KEYS.map((k) => filters[k]).join("|");

  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  useEffect(() => {
    api.get("/zones").then((d) => setZones(d.zones)).catch(() => {});
    api.get("/admin/users?role=AGENT").then((d) => setAgents(d.users)).catch(() => {});
  }, []);

  // Debounce the search box into the URL.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") || "") !== search.trim()) setFilter("q", search.trim());
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function load(offset = 0) {
    setLoading(true);
    setError("");
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    qs.set("limit", PAGE);
    qs.set("offset", offset);
    try {
      const data = await api.get(`/orders?${qs.toString()}`);
      setOrders((prev) => (offset ? [...prev, ...data.orders] : data.orders));
      setTotal(data.total ?? data.orders.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const anyFilter = FILTER_KEYS.some((k) => filters[k]);

  return (
    <Layout title="All Orders" subtitle={loading && !orders.length ? "Loading…" : `${total} order${total === 1 ? "" : "s"}${anyFilter ? " match these filters" : " across the platform"}`}>
      {error && <div className="banner banner-error" role="alert">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="order-search">Search by order number</label>
          <input id="order-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. LM-MVKY" />
        </div>
        <div className="grid grid-4">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="f-status">Status</label>
            <select id="f-status" value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
              <option value="">All</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="f-zone">Zone</label>
            <select id="f-zone" value={filters.zoneId} onChange={(e) => setFilter("zoneId", e.target.value)}>
              <option value="">All</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="f-agent">Agent</label>
            <select id="f-agent" value={filters.agentId} onChange={(e) => setFilter("agentId", e.target.value)}>
              <option value="">All</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="f-type">Order type</label>
            <select id="f-type" value={filters.orderType} onChange={(e) => setFilter("orderType", e.target.value)}>
              <option value="">All</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
            </select>
          </div>
        </div>
        {anyFilter && (
          <button className="btn-text" style={{ marginTop: 12 }} onClick={() => { setSearch(""); setParams({}, { replace: true }); }}>
            Clear filters
          </button>
        )}
      </div>

      {!loading && orders.length === 0 ? (
        <div className="card empty-state"><h3>No orders match these filters</h3></div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order #</th><th>Customer</th><th>Route</th><th>Agent</th><th>Type</th><th>Charge</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} {...rowLink(`/orders/${o.id}`)}>
                    <td className="mono">{o.orderNumber}</td>
                    <td>{o.customer?.name}</td>
                    <td>{o.pickupZone?.name || "—"} &rarr; {o.dropZone?.name || "—"}</td>
                    <td>{o.assignedAgent?.name || <span className="text-soft">Unassigned</span>}</td>
                    <td>{o.orderType}</td>
                    <td className="mono">{money(o.totalCharge)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.length < total && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button className="btn btn-ghost" disabled={loading} onClick={() => load(orders.length)}>
                {loading ? "Loading…" : `Load more (${total - orders.length} left)`}
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
