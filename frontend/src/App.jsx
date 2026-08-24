import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

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

function RoleRoute({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

function homeFor(role) {
  if (role === "ADMIN") return "/admin";
  if (role === "AGENT") return "/agent";
  return "/customer";
}

function FullPageLoader() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7690" }}>
      Loading…
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Register />} />

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

      <Route
        path="/"
        element={
          loading ? <FullPageLoader /> : user ? <Navigate to={homeFor(user.role)} replace /> : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
