import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { api } from "../../api/client";

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/stats").then(setStats).catch((e) => setError(e.message));
  }, []);

  const STATUS_ORDER = ["PLACED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RESCHEDULED", "CANCELLED"];

  return (
    <Layout title="Overview" subtitle="Operations at a glance">
      {error && <div className="banner banner-error">{error}</div>}
      {!stats ? (
        <p className="text-soft">Loading…</p>
      ) : (
        <>
          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">Total orders</div>
              <div className="stat-value">{stats.totalOrders}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total agents</div>
              <div className="stat-value">{stats.totalAgents}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Available agents</div>
              <div className="stat-value">{stats.availableAgents}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Customers</div>
              <div className="stat-value">{stats.totalCustomers}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Orders by status</div>
            <div className="grid grid-3">
              {STATUS_ORDER.map((s) => (
                <div key={s} className="flex-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--paper-50)" }}>
                  <span style={{ fontSize: 13 }}>{s.replace(/_/g, " ")}</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{stats.statusCounts[s] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3" style={{ marginTop: 20 }}>
            <Link to="/admin/orders" className="btn btn-ghost">View all orders</Link>
            <Link to="/admin/new-order" className="btn btn-accent">Create order for a customer</Link>
          </div>
        </>
      )}
    </Layout>
  );
}
