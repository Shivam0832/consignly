import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import ManifestTrail from "../components/ManifestTrail";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

// Mirrors backend ALLOWED_TRANSITIONS (src/utils/constants.js) so agents only
// see legal next steps. Admin bypasses this entirely via the override panel.
const ALLOWED_TRANSITIONS = {
  PLACED: ["ASSIGNED"],
  ASSIGNED: ["PICKED_UP"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  FAILED: [],
  RESCHEDULED: [],
  CANCELLED: [],
};

const ALL_STATUSES = ["PLACED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RESCHEDULED", "CANCELLED"];

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [selectedAgent, setSelectedAgent] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [failureNote, setFailureNote] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/orders/${id}`);
      setOrder(data.order);
      setOverrideStatus(data.order.status);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    if (user?.role === "ADMIN") {
      api.get("/admin/users?role=AGENT").then((d) => setAgents(d.users)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function withBusy(fn) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const handleManualAssign = () =>
    withBusy(async () => {
      if (!selectedAgent) return setError("Choose an agent first");
      await api.post(`/orders/${id}/assign`, { agentId: selectedAgent });
      setNotice("Agent assigned.");
    });

  const handleAutoAssign = () =>
    withBusy(async () => {
      await api.post(`/orders/${id}/auto-assign`, {});
      setNotice("Nearest available agent auto-assigned.");
    });

  const handleStatusUpdate = (status) =>
    withBusy(async () => {
      const body = { status };
      if (status === "FAILED") body.failureReason = failureNote || "Delivery attempt failed";
      await api.patch(`/orders/${id}/status`, body);
      setNotice(`Status updated to ${status.replace(/_/g, " ")}.`);
      setFailureNote("");
    });

  const handleOverride = () =>
    withBusy(async () => {
      await api.patch(`/orders/${id}/status`, { status: overrideStatus, note: "Admin override" });
      setNotice("Status overridden by admin.");
    });

  const handleReschedule = () =>
    withBusy(async () => {
      if (!rescheduleDate) return setError("Pick a new delivery date first");
      await api.post(`/orders/${id}/reschedule`, { newDate: rescheduleDate, autoAssign: true });
      setNotice("Delivery rescheduled and a new agent has been assigned.");
    });

  if (loading) return <Layout title="Order"><p className="text-soft">Loading…</p></Layout>;
  if (!order) return <Layout title="Order not found">{error && <div className="banner banner-error">{error}</div>}</Layout>;

  const canAgentAct = user.role === "AGENT" && order.assignedAgentId === user.id;
  const nextSteps = ALLOWED_TRANSITIONS[order.status] || [];
  const backTo = user.role === "ADMIN" ? "/admin/orders" : user.role === "AGENT" ? "/agent" : "/customer";

  return (
    <Layout title={order.orderNumber} subtitle="Order details & live tracking">
      <Link to={backTo} className="text-soft" style={{ fontSize: 13, textDecoration: "none" }}>&larr; Back</Link>

      <div style={{ height: 16 }} />
      {error && <div className="banner banner-error">{error}</div>}
      {notice && <div className="banner banner-success">{notice}</div>}

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        {/* LEFT COLUMN: order summary + charge breakdown */}
        <div>
          <div className="card">
            <div className="flex-between" style={{ marginBottom: 14 }}>
              <span className="mono" style={{ fontWeight: 700, fontSize: 15 }}>{order.orderNumber}</span>
              <StatusBadge status={order.status} />
            </div>

            <div className="grid grid-2" style={{ fontSize: 13.5, marginBottom: 6 }}>
              <div>
                <div className="stat-label">Pickup</div>
                <p style={{ marginTop: 4 }}>{order.pickupAddress}</p>
                <p className="text-soft mono" style={{ marginTop: 2 }}>{order.pickupPincode} · {order.pickupZone?.name}</p>
              </div>
              <div>
                <div className="stat-label">Drop</div>
                <p style={{ marginTop: 4 }}>{order.dropAddress}</p>
                <p className="text-soft mono" style={{ marginTop: 2 }}>{order.dropPincode} · {order.dropZone?.name}</p>
              </div>
            </div>

            <div className="divider" />

            <div className="grid grid-3" style={{ fontSize: 13 }}>
              <div><div className="stat-label">Order type</div><p style={{ marginTop: 4 }}>{order.orderType}</p></div>
              <div><div className="stat-label">Payment</div><p style={{ marginTop: 4 }}>{order.paymentType}</p></div>
              <div><div className="stat-label">Zone type</div><p style={{ marginTop: 4 }}>{order.zoneType}</p></div>
              <div><div className="stat-label">Dimensions</div><p style={{ marginTop: 4 }}>{order.lengthCm}×{order.breadthCm}×{order.heightCm} cm</p></div>
              <div><div className="stat-label">Actual weight</div><p style={{ marginTop: 4 }}>{order.actualWeightKg} kg</p></div>
              <div><div className="stat-label">Volumetric weight</div><p style={{ marginTop: 4 }}>{order.volumetricWeightKg} kg</p></div>
            </div>

            <div className="divider" />

            <div className="flex-between" style={{ fontSize: 13.5 }}>
              <span className="text-soft">Base charge</span><span className="mono">₹{order.baseCharge}</span>
            </div>
            <div className="flex-between" style={{ fontSize: 13.5, marginTop: 6 }}>
              <span className="text-soft">Weight charge ({order.billableWeightKg} kg billable)</span><span className="mono">₹{order.weightCharge}</span>
            </div>
            {order.codSurcharge > 0 && (
              <div className="flex-between" style={{ fontSize: 13.5, marginTop: 6 }}>
                <span className="text-soft">COD surcharge</span><span className="mono">₹{order.codSurcharge}</span>
              </div>
            )}
            <div className="flex-between" style={{ fontSize: 15, marginTop: 10, fontWeight: 700 }}>
              <span>Total charge</span><span className="mono">₹{order.totalCharge}</span>
            </div>
          </div>

          <div className="card">
            <div className="card-title">People</div>
            <div className="grid grid-2" style={{ fontSize: 13.5 }}>
              <div>
                <div className="stat-label">Customer</div>
                <p style={{ marginTop: 4 }}>{order.customer?.name}</p>
                <p className="text-soft" style={{ marginTop: 2 }}>{order.customer?.email}</p>
              </div>
              <div>
                <div className="stat-label">Delivery agent</div>
                <p style={{ marginTop: 4 }}>{order.assignedAgent?.name || "Not yet assigned"}</p>
                {order.assignedAgent && <p className="text-soft" style={{ marginTop: 2 }}>{order.assignedAgent.email}</p>}
              </div>
            </div>
            {order.scheduledDate && (
              <>
                <div className="divider" />
                <div style={{ fontSize: 13.5 }}>
                  <span className="stat-label">Scheduled date</span>
                  <p style={{ marginTop: 4 }}>{new Date(order.scheduledDate).toDateString()}</p>
                </div>
              </>
            )}
          </div>

          {/* ROLE-SPECIFIC ACTIONS */}
          {user.role === "ADMIN" && (
            <div className="card">
              <div className="card-title">Admin actions</div>

              {["PLACED", "RESCHEDULED"].includes(order.status) && (
                <div style={{ marginBottom: 18 }}>
                  <div className="stat-label" style={{ marginBottom: 8 }}>Assign a delivery agent</div>
                  <div className="flex gap-2">
                    <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 6, border: "1.5px solid var(--paper-100)" }}>
                      <option value="">Select agent…</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} — {a.homeZone?.name || "no zone"} {a.isAvailable ? "" : "(unavailable)"}</option>
                      ))}
                    </select>
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={handleManualAssign}>Assign</button>
                  </div>
                  <button className="btn btn-accent btn-sm" style={{ marginTop: 8 }} disabled={busy} onClick={handleAutoAssign}>
                    Auto-assign nearest available agent
                  </button>
                </div>
              )}

              <div className="stat-label" style={{ marginBottom: 8 }}>Override status (any transition)</div>
              <div className="flex gap-2">
                <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 6, border: "1.5px solid var(--paper-100)" }}>
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
                <button className="btn btn-danger btn-sm" disabled={busy || overrideStatus === order.status} onClick={handleOverride}>
                  Override
                </button>
              </div>
              <p className="field-hint" style={{ marginTop: 6 }}>Bypasses the normal lifecycle — use for corrections and exceptions.</p>
            </div>
          )}

          {canAgentAct && nextSteps.length > 0 && (
            <div className="card">
              <div className="card-title">Update delivery status</div>
              {nextSteps.includes("FAILED") && (
                <div className="field">
                  <label>Failure reason (only needed if marking Failed)</label>
                  <input value={failureNote} onChange={(e) => setFailureNote(e.target.value)} placeholder="e.g. Customer not available" />
                </div>
              )}
              <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                {nextSteps.map((s) => (
                  <button
                    key={s}
                    className={`btn btn-sm ${s === "FAILED" ? "btn-danger" : "btn-accent"}`}
                    disabled={busy}
                    onClick={() => handleStatusUpdate(s)}
                  >
                    Mark {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {user.role === "CUSTOMER" && order.status === "FAILED" && order.customerId === user.id && (
            <div className="card">
              <div className="card-title">Reschedule delivery</div>
              <p className="text-soft" style={{ fontSize: 13.5, marginBottom: 12 }}>
                Your last delivery attempt failed{order.failureReason ? `: "${order.failureReason}"` : "."} Pick a new date and we'll assign a fresh agent.
              </p>
              <div className="flex gap-2">
                <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-accent btn-sm" disabled={busy} onClick={handleReschedule}>Reschedule</button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: tracking timeline */}
        <div className="card">
          <div className="card-title">Tracking timeline</div>
          <ManifestTrail history={order.trackingHistory} />
        </div>
      </div>
    </Layout>
  );
}
