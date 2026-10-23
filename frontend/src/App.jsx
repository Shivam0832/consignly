import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { homeFor } from "./components/nav";

import Landing from "./pages/Landing";
import Track from "./pages/Track";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OrderDetail from "./pages/OrderDetail";

import CustomerOrders from "./pages/customer/CustomerOrders";
import PlaceOrder from "./pages/customer/PlaceOrder";

import AgentDashboard from "./pages/agent/AgentDashboard";

import AdminOverview from "./pages/admin/AdminOverview";
import AdminOrders from "./pages/admin/AdminOrders";
import Zones from "./pages/admin/Zones";
import RateCards from "./pages/admin/RateCards";
import Agents from "./pages/admin/Agents";
import CreateOrderAdmin from "./pages/admin/CreateOrderAdmin";

function Loader() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="skeleton" style={{ width: 180, height: 10 }} aria-label="Loading" />
    </div>
  );
}

function RoleRoute({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  const guestOnly = (el) => (loading ? <Loader /> : user ? <Navigate to={homeFor(user.role)} replace /> : el);

  return (
    <Routes>
      <Route path="/" element={guestOnly(<Landing />)} />
      <Route path="/track" element={<Track />} />
      <Route path="/track/:code" element={<Track />} />
      <Route path="/login" element={guestOnly(<Login />)} />
      <Route path="/register" element={guestOnly(<Register />)} />

      <Route path="/customer" element={<RoleRoute roles={["CUSTOMER"]}><CustomerOrders /></RoleRoute>} />
      <Route path="/customer/new" element={<RoleRoute roles={["CUSTOMER"]}><PlaceOrder /></RoleRoute>} />

      <Route path="/agent" element={<RoleRoute roles={["AGENT"]}><AgentDashboard /></RoleRoute>} />

      <Route path="/admin" element={<RoleRoute roles={["ADMIN"]}><AdminOverview /></RoleRoute>} />
      <Route path="/admin/orders" element={<RoleRoute roles={["ADMIN"]}><AdminOrders /></RoleRoute>} />
      <Route path="/admin/zones" element={<RoleRoute roles={["ADMIN"]}><Zones /></RoleRoute>} />
      <Route path="/admin/rates" element={<RoleRoute roles={["ADMIN"]}><RateCards /></RoleRoute>} />
      <Route path="/admin/agents" element={<RoleRoute roles={["ADMIN"]}><Agents /></RoleRoute>} />
      <Route path="/admin/new-order" element={<RoleRoute roles={["ADMIN"]}><CreateOrderAdmin /></RoleRoute>} />

      <Route path="/orders/:id" element={<RoleRoute roles={["CUSTOMER", "AGENT", "ADMIN"]}><OrderDetail /></RoleRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
