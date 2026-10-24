import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PackagePlus } from "lucide-react";
import Layout from "../../components/Layout";
import StatusBadge from "../../components/StatusBadge";
import RouteCell from "../../components/RouteCell";
import Empty from "../../components/Empty";
import useRowLink from "../../components/useRowLink";
import { api } from "../../api/client";
import { TERMINAL, money, relative } from "../../lib/orderStatus";

export default function CustomerOrders() {
  const rowLink = useRowLink();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("active");

  useEffect(() => {
    api.get("/orders").then((d) => setOrders(d.orders)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const active = orders.filter((o) => !TERMINAL.includes(o.status));
  const past = orders.filter((o) => TERMINAL.includes(o.status));
  const shown = tab === "active" ? active : past;
  const failed = active.filter((o) => o.status === "FAILED");

  return (
    <Layout title="My orders" subtitle="Everything you've sent, newest first." actions={<Link to="/customer/new" className="btn btn-primary"><PackagePlus aria-hidden="true" />Book a delivery</Link>}>
      {error && <div className="notice notice-bad" role="alert">{error}</div>}
      {failed.length > 0 && (
        <div className="notice notice-bad">
          <span className="grow">{failed.length === 1 ? "A delivery attempt failed." : `${failed.length} delivery attempts failed.`} Pick a new date to try again.</span>
          <Link to={`/orders/${failed[0].id}`}>Reschedule</Link>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 220, borderRadius: 16 }} />
      ) : orders.length === 0 ? (
        <div className="card">
          <Empty title="No deliveries yet" action={<Link to="/customer/new" className="btn btn-primary">Book your first delivery</Link>}>
            Book a delivery and you'll be able to follow it here, step by step.
          </Empty>
        </div>
      ) : (
        <>
          <div className="tabs" role="group" aria-label="Filter orders">
            <button aria-pressed={tab === "active"} onClick={() => setTab("active")}>In progress<span className="count">{active.length}</span></button>
            <button aria-pressed={tab === "past"} onClick={() => setTab("past")}>Completed<span className="count">{past.length}</span></button>
          </div>
          {shown.length === 0 ? (
            <div className="card"><Empty title={tab === "active" ? "Nothing on the move" : "Nothing completed yet"} /></div>
          ) : (
            <div className="card card-flush">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Order</th><th>Route</th><th>Status</th><th className="num">Charge</th></tr>
                  </thead>
                  <tbody>
                    {shown.map((o) => (
                      <tr key={o.id} {...rowLink(`/orders/${o.id}`)}>
                        <td><div className="cell-main code">{o.orderNumber}</div><div className="cell-sub">{relative(o.createdAt)}</div></td>
                        <td><RouteCell order={o} /></td>
                        <td><StatusBadge status={o.status} /></td>
                        <td className="num"><span className="cell-main">{money(o.totalCharge)}</span><div className="cell-sub">{o.paymentType === "COD" ? "Cash on delivery" : "Prepaid"}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
