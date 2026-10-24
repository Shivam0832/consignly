import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Truck, Users, IndianRupee, AlertTriangle, Clock } from "lucide-react";
import Layout from "../../components/Layout";
import BarChart from "../../components/BarChart";
import StatusBadge from "../../components/StatusBadge";
import RouteCell from "../../components/RouteCell";
import useRowLink from "../../components/useRowLink";
import { api } from "../../api/client";
import { ALL_STATUSES, TONE, label, money, relative } from "../../lib/orderStatus";

const TONE_COLOR = { wait: "var(--wait)", move: "var(--route)", ok: "var(--ok)", bad: "var(--bad)" };

export default function AdminOverview() {
  const rowLink = useRowLink();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/stats").then(setStats).catch((e) => setError(e.message));
    api.get("/orders?limit=6").then((d) => setRecent(d.orders)).catch(() => {});
  }, []);

  const c = stats?.statusCounts || {};
  const onRoad = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].reduce((n, s) => n + (c[s] || 0), 0);
  const max = Math.max(1, ...ALL_STATUSES.map((s) => c[s] || 0));
  const revenue14 = (stats?.daily || []).reduce((n, d) => n + d.revenue, 0);
  const orders14 = (stats?.daily || []).reduce((n, d) => n + d.orders, 0);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <Layout title={greet} subtitle="Here's how deliveries are moving today.">
      {error && <div className="notice notice-bad" role="alert">{error}</div>}

      {stats && (c.PLACED > 0 || c.FAILED > 0) && (
        <div className="stack" style={{ marginBottom: 16 }}>
          {c.PLACED > 0 && (
            <div className="notice notice-tape">
              <Clock aria-hidden="true" />
              <span className="grow"><strong>{c.PLACED}</strong> order{c.PLACED === 1 ? " is" : "s are"} waiting for an agent.</span>
              <Link to="/admin/orders?status=PLACED">Dispatch now</Link>
            </div>
          )}
          {c.FAILED > 0 && (
            <div className="notice notice-bad">
              <AlertTriangle aria-hidden="true" />
              <span className="grow"><strong>{c.FAILED}</strong> failed deliver{c.FAILED === 1 ? "y needs" : "ies need"} follow-up.</span>
              <Link to="/admin/orders?status=FAILED">Review</Link>
            </div>
          )}
        </div>
      )}

      <div className="cols-4" style={{ marginBottom: 16 }}>
        {!stats ? [0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 112, borderRadius: 16 }} />) : (
          <>
            <div className="tile"><div className="tile-label"><Package aria-hidden="true" />Orders, last 14 days</div><div className="tile-value">{orders14}</div><div className="tile-foot">{stats.totalOrders} all time</div></div>
            <div className="tile"><div className="tile-label"><Truck aria-hidden="true" />On the road</div><div className="tile-value">{onRoad}</div><div className="tile-foot">{c.DELIVERED || 0} delivered</div></div>
            <div className="tile"><div className="tile-label"><IndianRupee aria-hidden="true" />Booked, last 14 days</div><div className="tile-value">{money(revenue14)}</div><div className="tile-foot">Excludes cancelled</div></div>
            <div className="tile"><div className="tile-label"><Users aria-hidden="true" />Agents on duty</div><div className="tile-value">{stats.availableAgents}<small>/ {stats.totalAgents}</small></div><div className="tile-foot">{stats.totalCustomers} customer{stats.totalCustomers === 1 ? "" : "s"}</div></div>
          </>
        )}
      </div>

      <div className="layout-2" style={{ marginBottom: 16 }}>
        <section className="card">
          <div className="card-head"><h2>Orders per day</h2><span className="muted" style={{ fontSize: 13 }}>Last 14 days</span></div>
          {stats ? <BarChart data={stats.daily} /> : <div className="skeleton" style={{ height: 200 }} />}
        </section>
        <section className="card">
          <div className="card-head"><h2>By status</h2><Link to="/admin/orders" style={{ fontSize: 13 }}>All orders</Link></div>
          <ul className="status-bars">
            {ALL_STATUSES.map((s) => (
              <li key={s}>
                <Link to={`/admin/orders?status=${s}`}>
                  <span>{label(s)}</span>
                  <span className="track" style={{ color: TONE_COLOR[TONE[s]] }}><span className="fill" style={{ width: `${((c[s] || 0) / max) * 100}%` }} /></span>
                  <span className="n">{c[s] || 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card card-flush">
        <div className="card-head" style={{ padding: "18px 20px 0" }}><h2>Latest orders</h2></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Route</th><th>Status</th><th className="num">Charge</th></tr></thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} {...rowLink(`/orders/${o.id}`)}>
                  <td><div className="cell-main code">{o.orderNumber}</div><div className="cell-sub">{relative(o.createdAt)}</div></td>
                  <td>{o.customer?.name}</td>
                  <td><RouteCell order={o} /></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="num cell-main">{money(o.totalCharge)}</td>
                </tr>
              ))}
              {recent.length === 0 && <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 32 }}>No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
