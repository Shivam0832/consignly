import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import StatusBadge from "../../components/StatusBadge";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function AgentDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleAvailability() {
    setBusy(true);
    try {
      await api.patch(`/admin/agents/${user.id}/status`, { isAvailable: !available });
      setAvailable((a) => !a);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const active = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status));
  const completed = orders.filter((o) => ["DELIVERED", "CANCELLED"].includes(o.status));

  return (
    <Layout title="My Deliveries" subtitle="Orders assigned to you, oldest first">
      {error && <div className="banner banner-error">{error}</div>}

      <div className="card flex-between" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 600 }}>Availability</div>
          <p className="text-soft" style={{ fontSize: 13, marginTop: 2 }}>
            {available ? "You're available for new auto-assignments." : "You're marked unavailable — you won't receive new auto-assigned orders."}
          </p>
        </div>
        <button className={`btn btn-sm ${available ? "btn-ghost" : "btn-accent"}`} disabled={busy} onClick={toggleAvailability}>
          {available ? "Go unavailable" : "Go available"}
        </button>
      </div>

      <h3 style={{ fontSize: 15, marginBottom: 10 }}>Active ({active.length})</h3>
      {!loading && active.length === 0 ? (
        <div className="card empty-state" style={{ marginBottom: 20 }}>
          <h3>Nothing assigned right now</h3>
          <p>New auto- or manually-assigned orders will show up here.</p>
        </div>
      ) : (
        <div className="table-wrap" style={{ marginBottom: 24 }}>
          <table>
            <thead>
              <tr><th>Order #</th><th>Route</th><th>Payment</th><th>Status</th></tr>
            </thead>
            <tbody>
              {active.map((o) => (
                <tr key={o.id} className="link-row" onClick={() => (window.location.href = `/orders/${o.id}`)}>
                  <td className="mono">{o.orderNumber}</td>
                  <td>{o.pickupZone?.name} &rarr; {o.dropZone?.name}</td>
                  <td>{o.paymentType}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {completed.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Completed ({completed.length})</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Order #</th><th>Route</th><th>Status</th></tr>
              </thead>
              <tbody>
                {completed.map((o) => (
                  <tr key={o.id} className="link-row" onClick={() => (window.location.href = `/orders/${o.id}`)}>
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
