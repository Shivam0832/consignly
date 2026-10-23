import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import StatusBadge from "../../components/StatusBadge";
import useRowLink from "../../components/useRowLink";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { AGENT_TRANSITIONS, money } from "../../lib/orderStatus";

export default function AgentDashboard() {
  const { user } = useAuth();
  const rowLink = useRowLink();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [ordersData, meData] = await Promise.all([api.get("/orders"), api.me()]);
      setOrders(ordersData.orders);
      setAvailable(meData.user.isAvailable);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleAvailability() {
    setBusy(true);
    setError("");
    try {
      const data = await api.patch(`/admin/agents/${user.id}/status`, { isAvailable: !available });
      setAvailable(data.user.isAvailable);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // "To do" = orders the agent can still act on; everything else is history.
  const todo = orders
    .filter((o) => AGENT_TRANSITIONS[o.status])
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const history = orders.filter((o) => !AGENT_TRANSITIONS[o.status]);

  return (
    <Layout title="My Deliveries" subtitle="Your open jobs, oldest first">
      {error && <div className="banner banner-error" role="alert">{error}</div>}

      <div className={`card availability ${available ? "is-on" : "is-off"}`} style={{ marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{available === null ? "Availability" : available ? "You're on duty" : "You're off duty"}</div>
          <p className="text-soft" style={{ fontSize: 13, marginTop: 2 }}>
            {available ? "You'll receive new auto-assigned orders." : "You won't receive new auto-assigned orders."}
          </p>
        </div>
        <button
          className={`btn btn-sm ${available ? "btn-ghost" : "btn-accent"}`}
          disabled={busy || available === null}
          onClick={toggleAvailability}
          aria-pressed={!!available}
        >
          {available ? "Go off duty" : "Go on duty"}
        </button>
      </div>

      <h2 className="section-title">To do <span className="count">{todo.length}</span></h2>
      {loading ? (
        <div className="card"><div className="skeleton" style={{ height: 90 }} /></div>
      ) : todo.length === 0 ? (
        <div className="card empty-state" style={{ marginBottom: 20 }}>
          <h3>Nothing assigned right now</h3>
          <p>New orders show up here as soon as they're assigned to you.</p>
        </div>
      ) : (
        <div className="job-list">
          {todo.map((o) => (
            <div key={o.id} {...rowLink(`/orders/${o.id}`)} className="card job-card link-row">
              <div className="flex-between" style={{ gap: 8, flexWrap: "wrap" }}>
                <span className="mono" style={{ fontWeight: 700 }}>{o.orderNumber}</span>
                <StatusBadge status={o.status} />
              </div>
              <div className="job-route">
                <div><span className="stat-label">Pickup</span><p>{o.pickupAddress}</p><span className="mono text-soft">{o.pickupPincode}</span></div>
                <div><span className="stat-label">Drop</span><p>{o.dropAddress}</p><span className="mono text-soft">{o.dropPincode}</span></div>
              </div>
              <div className="job-meta text-soft">
                {o.paymentType === "COD" ? <b className="cod-tag">Collect cash {money(o.totalCharge)}</b> : "Prepaid"}
                {o.scheduledDate && <span> · Due {new Date(o.scheduledDate).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <>
          <h2 className="section-title">History <span className="count">{history.length}</span></h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Order #</th><th>Route</th><th>Status</th></tr>
              </thead>
              <tbody>
                {history.map((o) => (
                  <tr key={o.id} {...rowLink(`/orders/${o.id}`)}>
                    <td className="mono">{o.orderNumber}</td>
                    <td>{o.pickupZone?.name} &rarr; {o.dropZone?.name}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}
