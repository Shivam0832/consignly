import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import StatusStepper from "../components/StatusStepper";
import ManifestTrail from "../components/ManifestTrail";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  ALL_STATUSES, AGENT_TRANSITIONS, ASSIGNABLE, CUSTOMER_CANCELLABLE, TERMINAL, label, money, todayISO,
} from "../lib/orderStatus";

const REFRESH_MS = 20000;

function describeAssignment(a, fallback) {
  if (!a) return fallback;
  if (!a.assigned) return "No agent is free right now — an admin will assign one shortly.";
  return `Assigned to ${a.agentName}${a.widenedSearch ? " (from a neighbouring zone)" : ""}.`;
}

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const [selectedAgent, setSelectedAgent] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [failureNote, setFailureNote] = useState("");

  // `quiet` refreshes keep whatever message is on screen.
  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true);
      try {
        const data = await api.get(`/orders/${id}`);
        setOrder(data.order);
        setOverrideStatus(data.order.status);
        setUpdatedAt(new Date());
      } catch (err) {
        if (!quiet) setError(err.message);
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load();
    if (user?.role === "ADMIN") {
      api.get("/admin/users?role=AGENT").then((d) => setAgents(d.users)).catch(() => {});
    }
  }, [id, load, user?.role]);

  // Live tracking: poll while the order is still moving and the tab is visible.
  useEffect(() => {
    if (!order || TERMINAL.includes(order.status)) return undefined;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load({ quiet: true });
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [order, load]);

  /** Run an action; on success refresh quietly so the message stays visible. */
  async function act(fn) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const message = await fn();
      if (message) setNotice(message);
      await load({ quiet: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const handleManualAssign = () => {
    if (!selectedAgent) return setError("Choose an agent first.");
    return act(async () => {
      await api.post(`/orders/${id}/assign`, { agentId: selectedAgent });
      return "Agent assigned.";
    });
  };

  const handleAutoAssign = () =>
    act(async () => {
      const data = await api.post(`/orders/${id}/auto-assign`, {});
      return describeAssignment(data.assignment, "Agent assigned.");
    });

  const handleStatusUpdate = (status) => {
    if (status === "FAILED" && !failureNote.trim()) {
      return setError("Add a short reason before marking the delivery as failed.");
    }
    return act(async () => {
      const body = { status };
      if (status === "FAILED") body.failureReason = failureNote.trim();
      await api.patch(`/orders/${id}/status`, body);
      setFailureNote("");
      return `Marked as ${label(status).toLowerCase()}.`;
    });
  };

  const handleOverride = () => {
    if (!window.confirm(`Force this order from ${label(order.status)} to ${label(overrideStatus)}? This bypasses the normal flow.`)) return;
    return act(async () => {
      await api.patch(`/orders/${id}/status`, { status: overrideStatus, note: "Admin override" });
      return "Status overridden.";
    });
  };

  const handleReschedule = () => {
    if (!rescheduleDate) return setError("Pick a new delivery date first.");
    return act(async () => {
      const data = await api.post(`/orders/${id}/reschedule`, { newDate: rescheduleDate, autoAssign: true });
      setRescheduleDate("");
      return `Rescheduled for ${new Date(rescheduleDate).toDateString()}. ${describeAssignment(data.assignment, "")}`;
    });
  };

  const handleCancel = () => {
    if (!window.confirm("Cancel this order? This can't be undone.")) return;
    return act(async () => {
      await api.post(`/orders/${id}/cancel`, {});
      return "Order cancelled.";
    });
  };

  const backTo = user.role === "ADMIN" ? "/admin/orders" : user.role === "AGENT" ? "/agent" : "/customer";

  if (loading) {
    return (
      <Layout title="Order">
        <div className="card"><div className="skeleton" style={{ height: 140 }} /></div>
      </Layout>
    );
  }
  if (!order) {
    return (
      <Layout title="Order not found">
        {error && <div className="banner banner-error" role="alert">{error}</div>}
        <Link to={backTo} className="btn btn-ghost">&larr; Back to orders</Link>
      </Layout>
    );
  }

  const canAgentAct = user.role === "AGENT" && order.assignedAgentId === user.id;
  const nextSteps = AGENT_TRANSITIONS[order.status] || [];
  const canCustomerCancel = user.role === "CUSTOMER" && CUSTOMER_CANCELLABLE.includes(order.status);
  const canAdminCancel = user.role === "ADMIN" && !TERMINAL.includes(order.status);

  return (
    <Layout title={order.orderNumber} subtitle="Order details & live tracking">
      <div className="flex-between" style={{ marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <Link to={backTo} className="back-link">&larr; Back</Link>
        {updatedAt && !TERMINAL.includes(order.status) && (
          <span className="text-soft live-dot" style={{ fontSize: 12.5 }}>
            Live · updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div aria-live="polite">
        {error && <div className="banner banner-error" role="alert">{error}</div>}
        {notice && <div className="banner banner-success">{notice}</div>}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex-between" style={{ marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <span className="mono" style={{ fontWeight: 700, fontSize: 15 }}>{order.orderNumber}</span>
          <StatusBadge status={order.status} />
        </div>
        <StatusStepper status={order.status} history={order.trackingHistory} />
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        {/* LEFT COLUMN: order summary + charge breakdown */}
        <div>
          <div className="card">
            <div className="grid grid-2" style={{ fontSize: 13.5, marginBottom: 6 }}>
              <div>
                <div className="stat-label">Pickup</div>
                <p style={{ marginTop: 4 }}>{order.pickupAddress}</p>
                <p className="text-soft mono" style={{ marginTop: 2 }}>{order.pickupPincode} · {order.pickupZone?.name || "—"}</p>
              </div>
              <div>
                <div className="stat-label">Drop</div>
                <p style={{ marginTop: 4 }}>{order.dropAddress}</p>
                <p className="text-soft mono" style={{ marginTop: 2 }}>{order.dropPincode} · {order.dropZone?.name || "—"}</p>
              </div>
            </div>

            <div className="divider" />

            <div className="grid grid-3 compact-grid" style={{ fontSize: 13 }}>
              <div><div className="stat-label">Order type</div><p style={{ marginTop: 4 }}>{order.orderType}</p></div>
              <div><div className="stat-label">Payment</div><p style={{ marginTop: 4 }}>{order.paymentType === "COD" ? "Cash on delivery" : "Prepaid"}</p></div>
              <div><div className="stat-label">Zone type</div><p style={{ marginTop: 4 }}>{order.zoneType === "INTRA" ? "Same zone" : "Across zones"}</p></div>
              <div><div className="stat-label">Dimensions</div><p style={{ marginTop: 4 }}>{order.lengthCm}×{order.breadthCm}×{order.heightCm} cm</p></div>
              <div><div className="stat-label">Actual weight</div><p style={{ marginTop: 4 }}>{order.actualWeightKg} kg</p></div>
              <div><div className="stat-label">Volumetric</div><p style={{ marginTop: 4 }}>{order.volumetricWeightKg} kg</p></div>
            </div>

            <div className="divider" />

            <div className="flex-between" style={{ fontSize: 13.5 }}>
              <span className="text-soft">Base charge</span><span className="mono">{money(order.baseCharge)}</span>
            </div>
            <div className="flex-between" style={{ fontSize: 13.5, marginTop: 6 }}>
              <span className="text-soft">Weight charge ({order.billableWeightKg} kg billable)</span><span className="mono">{money(order.weightCharge)}</span>
            </div>
            {order.codSurcharge > 0 && (
              <div className="flex-between" style={{ fontSize: 13.5, marginTop: 6 }}>
                <span className="text-soft">COD surcharge</span><span className="mono">{money(order.codSurcharge)}</span>
              </div>
            )}
            <div className="flex-between" style={{ fontSize: 15, marginTop: 10, fontWeight: 700 }}>
              <span>Total charge</span><span className="mono">{money(order.totalCharge)}</span>
            </div>
          </div>

          <div className="card">
            <div className="card-title">People</div>
            <div className="grid grid-2" style={{ fontSize: 13.5 }}>
              <div>
                <div className="stat-label">Customer</div>
                <p style={{ marginTop: 4 }}>{order.customer?.name}</p>
                <p className="text-soft" style={{ marginTop: 2 }}>{order.customer?.email}</p>
                {user.role !== "CUSTOMER" && order.customer?.phone && (
                  <a className="text-link" href={`tel:${order.customer.phone}`}>{order.customer.phone}</a>
                )}
              </div>
              <div>
                <div className="stat-label">Delivery agent</div>
                <p style={{ marginTop: 4 }}>{order.assignedAgent?.name || "Not yet assigned"}</p>
                {order.assignedAgent && <p className="text-soft" style={{ marginTop: 2 }}>{order.assignedAgent.email}</p>}
                {order.assignedAgent?.phone && (
                  <a className="text-link" href={`tel:${order.assignedAgent.phone}`}>{order.assignedAgent.phone}</a>
                )}
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

              {ASSIGNABLE.includes(order.status) && (
                <div style={{ marginBottom: 18 }}>
                  <label className="stat-label" htmlFor="agent-select" style={{ display: "block", marginBottom: 8 }}>Assign a delivery agent</label>
                  <div className="inline-form">
                    <select id="agent-select" className="input" value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
                      <option value="">Select agent…</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} — {a.homeZone?.name || "no zone"}{a.isAvailable ? "" : " (unavailable)"}</option>
                      ))}
                    </select>
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={handleManualAssign}>Assign</button>
                  </div>
                  <button className="btn btn-accent btn-sm" style={{ marginTop: 8 }} disabled={busy} onClick={handleAutoAssign}>
                    Auto-assign best available agent
                  </button>
                </div>
              )}

              <label className="stat-label" htmlFor="override-select" style={{ display: "block", marginBottom: 8 }}>Override status</label>
              <div className="inline-form">
                <select id="override-select" className="input" value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)}>
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </select>
                <button className="btn btn-danger btn-sm" disabled={busy || overrideStatus === order.status} onClick={handleOverride}>
                  Override
                </button>
              </div>
              <p className="field-hint" style={{ marginTop: 6 }}>Bypasses the normal lifecycle — for corrections and exceptions. Every change is logged.</p>

              {canAdminCancel && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} disabled={busy} onClick={handleCancel}>
                  Cancel order
                </button>
              )}
            </div>
          )}

          {canAgentAct && nextSteps.length > 0 && (
            <div className="card">
              <div className="card-title">Update delivery status</div>
              {nextSteps.includes("FAILED") && (
                <div className="field">
                  <label htmlFor="fail-reason">Failure reason (required to mark failed)</label>
                  <input id="fail-reason" value={failureNote} onChange={(e) => setFailureNote(e.target.value)} placeholder="e.g. Customer not available" maxLength={200} />
                </div>
              )}
              <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                {nextSteps.map((s) => (
                  <button
                    key={s}
                    className={`btn ${s === "FAILED" ? "btn-danger" : "btn-accent"}`}
                    disabled={busy}
                    onClick={() => handleStatusUpdate(s)}
                  >
                    Mark {label(s).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {user.role === "CUSTOMER" && order.status === "FAILED" && (
            <div className="card">
              <div className="card-title">Reschedule delivery</div>
              <p className="text-soft" style={{ fontSize: 13.5, marginBottom: 12 }}>
                Your last delivery attempt failed{order.failureReason ? `: "${order.failureReason}"` : "."} Pick a new date and we'll find a fresh agent.
              </p>
              <div className="inline-form">
                <input type="date" className="input" min={todayISO()} value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} aria-label="New delivery date" />
                <button className="btn btn-accent btn-sm" disabled={busy} onClick={handleReschedule}>Reschedule</button>
              </div>
            </div>
          )}

          {canCustomerCancel && (
            <div className="card">
              <div className="card-title">Changed your mind?</div>
              <p className="text-soft" style={{ fontSize: 13.5, marginBottom: 12 }}>You can cancel until the agent picks up the parcel.</p>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={handleCancel}>Cancel order</button>
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
