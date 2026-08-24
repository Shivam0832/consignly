import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import StatusBadge from "../../components/StatusBadge";
import { api } from "../../api/client";

const STATUSES = ["", "PLACED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RESCHEDULED", "CANCELLED"];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [zones, setZones] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "", zoneId: "", agentId: "", orderType: "" });

  useEffect(() => {
    api.get("/zones").then((d) => setZones(d.zones)).catch(() => {});
    api.get("/admin/users?role=AGENT").then((d) => setAgents(d.users)).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    try {
      const data = await api.get(`/orders?${params.toString()}`);
      setOrders(data.orders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <Layout title="All Orders" subtitle="Every order across the platform">
      {error && <div className="banner banner-error">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="grid grid-4">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Status</label>
            <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace(/_/g, " ") : "All"}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Zone</label>
            <select value={filters.zoneId} onChange={(e) => setFilters((f) => ({ ...f, zoneId: e.target.value }))}>
              <option value="">All</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Agent</label>
            <select value={filters.agentId} onChange={(e) => setFilters((f) => ({ ...f, agentId: e.target.value }))}>
              <option value="">All</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Order type</label>
            <select value={filters.orderType} onChange={(e) => setFilters((f) => ({ ...f, orderType: e.target.value }))}>
              <option value="">All</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
            </select>
          </div>
        </div>
      </div>

      {!loading && orders.length === 0 ? (
        <div className="card empty-state"><h3>No orders match these filters</h3></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order #</th><th>Customer</th><th>Route</th><th>Agent</th><th>Type</th><th>Charge</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="link-row" onClick={() => (window.location.href = `/orders/${o.id}`)}>
                  <td className="mono">{o.orderNumber}</td>
                  <td>{o.customer?.name}</td>
                  <td>{o.pickupZone?.name} &rarr; {o.dropZone?.name}</td>
                  <td>{o.assignedAgent?.name || <span className="text-soft">Unassigned</span>}</td>
                  <td>{o.orderType}</td>
                  <td className="mono">₹{o.totalCharge}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
