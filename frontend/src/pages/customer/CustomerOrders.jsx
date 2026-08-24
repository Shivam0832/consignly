import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import StatusBadge from "../../components/StatusBadge";
import { api } from "../../api/client";

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/orders").then((d) => setOrders(d.orders)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="My Orders" subtitle="Every shipment you've placed, with live status">
      {error && <div className="banner banner-error">{error}</div>}

      {!loading && orders.length === 0 ? (
        <div className="card empty-state">
          <h3>No orders yet</h3>
          <p>Place your first order to see it tracked here.</p>
          <Link to="/customer/new" className="btn btn-accent" style={{ marginTop: 16 }}>Place an order</Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Route</th>
                <th>Type</th>
                <th>Payment</th>
                <th>Charge</th>
                <th>Status</th>
                <th>Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="link-row" onClick={() => (window.location.href = `/orders/${o.id}`)}>
                  <td className="mono">{o.orderNumber}</td>
                  <td>{o.pickupZone?.name} &rarr; {o.dropZone?.name}</td>
                  <td>{o.orderType}</td>
                  <td>{o.paymentType}</td>
                  <td className="mono">₹{o.totalCharge}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-soft">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
