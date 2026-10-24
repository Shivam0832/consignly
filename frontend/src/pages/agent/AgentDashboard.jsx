import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CircleDot, MapPin, Banknote, Navigation } from "lucide-react";
import Layout from "../../components/Layout";
import StatusBadge from "../../components/StatusBadge";
import RouteCell from "../../components/RouteCell";
import Empty from "../../components/Empty";
import useRowLink from "../../components/useRowLink";
import { useToast } from "../../components/Toaster";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { AGENT_TRANSITIONS, money, day, relative } from "../../lib/orderStatus";

const mapsLink = (address, pin) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address} ${pin}`)}`;

export default function AgentDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const rowLink = useRowLink();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/orders"), api.me()])
      .then(([o, me]) => { setOrders(o.orders); setAvailable(me.user.isAvailable); })
      .catch((e) => toast(e.message, "bad"))
      .finally(() => setLoading(false));
  }, [toast]);

  async function toggle() {
    setBusy(true);
    try {
      const data = await api.patch(`/admin/agents/${user.id}/status`, { isAvailable: !available });
      setAvailable(data.user.isAvailable);
      toast(data.user.isAvailable ? "You're on duty. New jobs can come your way." : "You're off duty. No new jobs will be assigned.");
    } catch (err) {
      toast(err.message, "bad");
    } finally {
      setBusy(false);
    }
  }

  const todo = orders.filter((o) => AGENT_TRANSITIONS[o.status]).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const history = orders.filter((o) => !AGENT_TRANSITIONS[o.status]);
  const cashToCollect = todo.filter((o) => o.paymentType === "COD").reduce((n, o) => n + Number(o.totalCharge), 0);
  const first = (user?.name || "").split(" ")[0];

  return (
    <Layout title={`Hi ${first}`} subtitle={todo.length ? `${todo.length} job${todo.length === 1 ? "" : "s"} today, oldest first.` : "No open jobs right now."}>
      <div className={`duty ${available ? "on" : ""}`}>
        <span className="light" aria-hidden="true" />
        <div className="grow">
          <div style={{ fontWeight: 700 }}>{available === null ? "Checking…" : available ? "On duty" : "Off duty"}</div>
          <div className="muted" style={{ fontSize: 13 }}>{available ? "You can be auto-assigned new jobs." : "Turn this on when you're ready for jobs."}</div>
        </div>
        {cashToCollect > 0 && <span className="cash hide-sm"><Banknote aria-hidden="true" />{money(cashToCollect)} to collect</span>}
        <button className="switch" role="switch" aria-checked={!!available} aria-label="On duty" disabled={busy || available === null} onClick={toggle} />
      </div>

      {loading ? (
        <div className="jobs">{[0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 210, borderRadius: 16 }} />)}</div>
      ) : todo.length === 0 ? (
        <div className="card" style={{ marginBottom: 32 }}><Empty title="All caught up">New jobs appear here as soon as they're assigned to you.</Empty></div>
      ) : (
        <div className="jobs">
          {todo.map((o) => {
            const toPickup = o.status === "ASSIGNED";
            return (
              <article key={o.id} className="job">
                <div className="row-between">
                  <Link to={`/orders/${o.id}`} className="code" style={{ fontWeight: 600, color: "var(--ink)" }}>{o.orderNumber}</Link>
                  <StatusBadge status={o.status} />
                </div>
                <div className="job-legs">
                  <div className="leg" style={{ opacity: toPickup ? 1 : 0.55 }}>
                    <CircleDot aria-hidden="true" />
                    <div><div className="addr">{o.pickupAddress}</div><div className="muted code" style={{ fontSize: 12.5 }}>{o.pickupPincode}</div></div>
                  </div>
                  <div className="leg" style={{ opacity: toPickup ? 0.55 : 1 }}>
                    <MapPin aria-hidden="true" />
                    <div><div className="addr">{o.dropAddress}</div><div className="muted code" style={{ fontSize: 12.5 }}>{o.dropPincode}</div></div>
                  </div>
                </div>
                <div className="job-foot">
                  {o.paymentType === "COD" ? <span className="cash"><Banknote aria-hidden="true" />Collect {money(o.totalCharge)}</span> : <span className="muted" style={{ fontSize: 13 }}>Prepaid{o.scheduledDate ? `, due ${day(o.scheduledDate)}` : ""}</span>}
                  <div className="row">
                    <a className="btn btn-ghost btn-sm" href={mapsLink(toPickup ? o.pickupAddress : o.dropAddress, toPickup ? o.pickupPincode : o.dropPincode)} target="_blank" rel="noreferrer"><Navigation aria-hidden="true" />{toPickup ? "To pickup" : "To drop"}</a>
                    <Link to={`/orders/${o.id}`} className="btn btn-dark btn-sm">Open</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <section>
          <h2 style={{ marginBottom: 12 }}>Recent history</h2>
          <div className="card card-flush">
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Order</th><th>Route</th><th>Status</th></tr></thead>
                <tbody>
                  {history.map((o) => (
                    <tr key={o.id} {...rowLink(`/orders/${o.id}`)}>
                      <td><div className="cell-main code">{o.orderNumber}</div><div className="cell-sub">{relative(o.updatedAt)}</div></td>
                      <td><RouteCell order={o} /></td>
                      <td><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
