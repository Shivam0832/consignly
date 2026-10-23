import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { api } from "../../api/client";
import { ALL_STATUSES, label } from "../../lib/orderStatus";

const TONE = {
  PLACED: "slate", RESCHEDULED: "slate",
  ASSIGNED: "amber", PICKED_UP: "amber", IN_TRANSIT: "amber", OUT_FOR_DELIVERY: "amber",
  DELIVERED: "teal", FAILED: "rust", CANCELLED: "rust",
};

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/stats").then(setStats).catch((e) => setError(e.message));
  }, []);

  const counts = stats?.statusCounts || {};
  const max = Math.max(1, ...ALL_STATUSES.map((s) => counts[s] || 0));
  const waiting = counts.PLACED || 0;
  const failed = counts.FAILED || 0;
  const onTheRoad = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].reduce((n, s) => n + (counts[s] || 0), 0);

  return (
    <Layout
      title="Overview"
      subtitle="Operations at a glance"
      actions={<Link to="/admin/new-order" className="btn btn-accent">+ Create order</Link>}
    >
      {error && <div className="banner banner-error" role="alert">{error}</div>}
      {!stats ? (
        <div className="grid grid-4">{[0, 1, 2, 3].map((i) => <div key={i} className="stat-card"><div className="skeleton" style={{ height: 58 }} /></div>)}</div>
      ) : (
        <>
          {(waiting > 0 || failed > 0) && (
            <div className="attention">
              {waiting > 0 && (
                <Link to="/admin/orders?status=PLACED" className="attention-item">
                  <b>{waiting}</b> order{waiting === 1 ? "" : "s"} waiting for an agent →
                </Link>
              )}
              {failed > 0 && (
                <Link to="/admin/orders?status=FAILED" className="attention-item is-bad">
                  <b>{failed}</b> failed deliver{failed === 1 ? "y" : "ies"} to follow up →
                </Link>
              )}
            </div>
          )}

          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">Total orders</div>
              <div className="stat-value">{stats.totalOrders}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">On the road</div>
              <div className="stat-value">{onTheRoad}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Agents available</div>
              <div className="stat-value">{stats.availableAgents}<span className="stat-of">/{stats.totalAgents}</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Customers</div>
              <div className="stat-value">{stats.totalCustomers}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Orders by status</div>
            {stats.totalOrders === 0 ? (
              <p className="text-soft" style={{ fontSize: 13.5 }}>No orders yet — they'll show up here as they come in.</p>
            ) : (
              <ul className="bar-list">
                {ALL_STATUSES.map((s) => (
                  <li key={s}>
                    <Link to={`/admin/orders?status=${s}`} className="bar-row">
                      <span className="bar-label">{label(s)}</span>
                      <span className="bar-track"><span className={`bar-fill tone-${TONE[s]}`} style={{ width: `${((counts[s] || 0) / max) * 100}%` }} /></span>
                      <span className="bar-value mono">{counts[s] || 0}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
