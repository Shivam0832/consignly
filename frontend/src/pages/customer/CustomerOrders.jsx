import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import StatusBadge from "../../components/StatusBadge";
import useRowLink from "../../components/useRowLink";
import { api } from "../../api/client";
import { TERMINAL, money } from "../../lib/orderStatus";

function OrdersTable({ orders, rowLink }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order #</th><th>Route</th><th>Type</th><th>Payment</th><th>Charge</th><th>Status</th><th>Placed</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} {...rowLink(`/orders/${o.id}`)}>
              <td className="mono">{o.orderNumber}</td>
              <td>{o.pickupZone?.name} &rarr; {o.dropZone?.name}</td>
              <td>{o.orderType}</td>
              <td>{o.paymentType === "COD" ? "COD" : "Prepaid"}</td>
              <td className="mono">{money(o.totalCharge)}</td>
              <td><StatusBadge status={o.status} /></td>
              <td className="text-soft">{new Date(o.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CustomerOrders() {
  const rowLink = useRowLink();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/orders").then((d) => setOrders(d.orders)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const active = orders.filter((o) => !TERMINAL.includes(o.status));
  const past = orders.filter((o) => TERMINAL.includes(o.status));

  return (
    <Layout
      title="My Orders"
      subtitle="Every shipment you've placed, with live status"
      actions={<Link to="/customer/new" className="btn btn-accent">+ New order</Link>}
    >
      {error && <div className="banner banner-error" role="alert">{error}</div>}

      {loading ? (
        <div className="card"><div className="skeleton" style={{ height: 120 }} /></div>
      ) : orders.length === 0 ? (
        <div className="card empty-state">
          <h3>No orders yet</h3>
          <p>Place your first order to see it tracked here.</p>
          <Link to="/customer/new" className="btn btn-accent" style={{ marginTop: 16 }}>Place an order</Link>
        </div>
      ) : (
        <>
          <h2 className="section-title">In progress <span className="count">{active.length}</span></h2>
          {active.length ? <OrdersTable orders={active} rowLink={rowLink} /> : <p className="text-soft section-empty">Nothing on the move right now.</p>}
          {past.length > 0 && (
            <>
              <h2 className="section-title">Completed & cancelled <span className="count">{past.length}</span></h2>
              <OrdersTable orders={past} rowLink={rowLink} />
            </>
          )}
        </>
      )}
    </Layout>
  );
}
