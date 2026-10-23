import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Phone, MapPin, Copy, Share2, Wand2, UserPlus, CalendarClock, Ban, ShieldAlert } from "lucide-react";
import Layout from "../components/Layout";
import Waybill from "../components/Waybill";
import Timeline from "../components/Timeline";
import Empty from "../components/Empty";
import { useToast } from "../components/Toaster";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  ALL_STATUSES, AGENT_TRANSITIONS, ASSIGNABLE, CUSTOMER_CANCELLABLE, TERMINAL, label, money, todayISO, day, relative,
} from "../lib/orderStatus";

const REFRESH_MS = 20000;
const mapsLink = (address, pin) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address} ${pin}`)}`;

function describeAssignment(a, fallback) {
  if (!a) return fallback;
  if (!a.assigned) return "No agent is free right now. Assign one when someone comes on duty.";
  return `Assigned to ${a.agentName}${a.widenedSearch ? " from a neighbouring zone" : ""}.`;
}

// Agent action buttons: the forward step is primary, failing is secondary.
const AGENT_VERB = {
  PICKED_UP: "I've picked it up",
  IN_TRANSIT: "Mark in transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
};

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const [selectedAgent, setSelectedAgent] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [failureNote, setFailureNote] = useState("");
  const [showFail, setShowFail] = useState(false);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true);
      try {
        const data = await api.get(`/orders/${id}`);
        setOrder(data.order);
        setOverrideStatus(data.order.status);
        setUpdatedAt(new Date());
        setError("");
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
    if (user?.role === "ADMIN") api.get("/admin/users?role=AGENT").then((d) => setAgents(d.users)).catch(() => {});
  }, [id, load, user?.role]);

  useEffect(() => {
    if (!order || TERMINAL.includes(order.status)) return undefined;
    const t = setInterval(() => document.visibilityState === "visible" && load({ quiet: true }), REFRESH_MS);
    return () => clearInterval(t);
  }, [order, load]);

  async function act(fn) {
    setBusy(true);
    try {
      const message = await fn();
      if (message) toast(message);
      await load({ quiet: true });
    } catch (err) {
      toast(err.message, "bad");
    } finally {
      setBusy(false);
    }
  }

  const assign = () => {
    if (!selectedAgent) return toast("Choose an agent first.", "bad");
    return act(async () => {
      await api.post(`/orders/${id}/assign`, { agentId: selectedAgent });
      return "Agent assigned.";
    });
  };
  const autoAssign = () => act(async () => describeAssignment((await api.post(`/orders/${id}/auto-assign`, {})).assignment, "Agent assigned."));
  const move = (status) => {
    if (status === "FAILED" && !failureNote.trim()) return toast("Add a short reason so the customer knows what happened.", "bad");
    return act(async () => {
      const body = { status };
      if (status === "FAILED") body.failureReason = failureNote.trim();
      await api.patch(`/orders/${id}/status`, body);
      setFailureNote(""); setShowFail(false);
      return status === "FAILED" ? "Marked as failed. The customer can now reschedule." : `Marked as ${label(status).toLowerCase()}.`;
    });
  };
  const override = () => {
    if (!window.confirm(`Change status from ${label(order.status)} to ${label(overrideStatus)}? This skips the normal steps.`)) return;
    return act(async () => {
      await api.patch(`/orders/${id}/status`, { status: overrideStatus, note: "Admin override" });
      return `Status changed to ${label(overrideStatus).toLowerCase()}.`;
    });
  };
  const reschedule = () => {
    if (!rescheduleDate) return toast("Pick a new delivery date first.", "bad");
    return act(async () => {
      const data = await api.post(`/orders/${id}/reschedule`, { newDate: rescheduleDate, autoAssign: true });
      setRescheduleDate("");
      return `Rescheduled for ${day(rescheduleDate)}. ${describeAssignment(data.assignment, "")}`;
    });
  };
  const cancel = () => {
    if (!window.confirm("Cancel this order? This can't be undone.")) return;
    return act(async () => {
      await api.post(`/orders/${id}/cancel`, {});
      return "Order cancelled.";
    });
  };

  async function copyTracking() {
    const url = `${window.location.origin}/track/${order.orderNumber}`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: `Tracking ${order.orderNumber}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast("Tracking link copied.");
      }
    } catch { /* user dismissed share sheet */ }
  }

  const backTo = user.role === "ADMIN" ? { to: "/admin/orders", label: "All orders" } : user.role === "AGENT" ? { to: "/agent", label: "My deliveries" } : { to: "/customer", label: "My orders" };

  if (loading) {
    return (
      <Layout back={backTo}>
        <div className="skeleton" style={{ height: 300, borderRadius: 22 }} />
      </Layout>
    );
  }
  if (!order) {
    return (
      <Layout back={backTo}>
        <div className="card"><Empty title="This order isn't available">{error || "It may have been removed, or you don't have access to it."}</Empty></div>
      </Layout>
    );
  }

  const isAgent = user.role === "AGENT" && order.assignedAgentId === user.id;
  const agentNext = (AGENT_TRANSITIONS[order.status] || []).filter((s) => s !== "FAILED");
  const agentCanFail = (AGENT_TRANSITIONS[order.status] || []).includes("FAILED");
  const customerCanCancel = user.role === "CUSTOMER" && CUSTOMER_CANCELLABLE.includes(order.status);
  const adminCanCancel = user.role === "ADMIN" && !TERMINAL.includes(order.status);

  return (
    <Layout
      back={backTo}
      title="Order details"
      subtitle={`Booked ${relative(order.createdAt)}${order.scheduledDate ? `, scheduled for ${day(order.scheduledDate)}` : ""}`}
      actions={
        <>
          {updatedAt && !TERMINAL.includes(order.status) && <span className="live">Live</span>}
          <button className="btn btn-ghost btn-sm" onClick={copyTracking}><Share2 aria-hidden="true" />Share tracking</button>
        </>
      }
    >
      <div className="stack">
        <Waybill order={order} from={order.pickupAddress} to={order.dropAddress} />

        {/* ---------- What can I do now? ---------- */}
        {isAgent && (agentNext.length > 0 || agentCanFail) && (
          <section className="card" aria-label="Update delivery">
            <div className="card-head"><h2>Next step</h2></div>
            <div className="row wrap">
              {agentNext.map((s) => (
                <button key={s} className="btn btn-primary btn-lg" disabled={busy} onClick={() => move(s)}>{AGENT_VERB[s] || `Mark ${label(s).toLowerCase()}`}</button>
              ))}
              <a className="btn btn-ghost btn-lg" href={mapsLink(order.status === "ASSIGNED" ? order.pickupAddress : order.dropAddress, order.status === "ASSIGNED" ? order.pickupPincode : order.dropPincode)} target="_blank" rel="noreferrer">
                <MapPin aria-hidden="true" />Directions
              </a>
              {order.customer?.phone && <a className="btn btn-ghost btn-lg" href={`tel:${order.customer.phone}`}><Phone aria-hidden="true" />Call customer</a>}
              {agentCanFail && !showFail && <button className="btn btn-quiet btn-lg" onClick={() => setShowFail(true)}>Couldn't deliver?</button>}
            </div>
            {agentCanFail && showFail && (
              <div className="input-group" style={{ marginTop: 14 }}>
                <label htmlFor="fail-reason" className="sr-only">Reason</label>
                <input id="fail-reason" className="input" value={failureNote} onChange={(e) => setFailureNote(e.target.value)} placeholder="What happened? e.g. Nobody home" maxLength={200} autoFocus />
                <button className="btn btn-danger" disabled={busy} onClick={() => move("FAILED")}>Mark failed</button>
              </div>
            )}
            {order.paymentType === "COD" && <p className="hint" style={{ marginTop: 12 }}>Collect {money(order.totalCharge)} in cash on delivery.</p>}
          </section>
        )}

        {user.role === "CUSTOMER" && order.status === "FAILED" && (
          <section className="card" style={{ borderColor: "var(--bad)" }}>
            <div className="card-head"><h2>We missed you</h2></div>
            <p className="soft" style={{ marginBottom: 14 }}>
              {order.failureReason ? `The agent noted: "${order.failureReason}". ` : ""}Pick a new day and we'll send a fresh agent.
            </p>
            <div className="input-group">
              <label htmlFor="new-date" className="sr-only">New delivery date</label>
              <input id="new-date" type="date" className="input" min={todayISO()} value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} style={{ maxWidth: 220 }} />
              <button className="btn btn-primary" disabled={busy} onClick={reschedule}><CalendarClock aria-hidden="true" />Reschedule</button>
            </div>
          </section>
        )}

        {user.role === "ADMIN" && (
          <section className="card" aria-label="Dispatch">
            <div className="card-head"><h2>Dispatch</h2></div>
            {ASSIGNABLE.includes(order.status) ? (
              <div className="row wrap" style={{ gap: 10 }}>
                <button className="btn btn-primary" disabled={busy} onClick={autoAssign}><Wand2 aria-hidden="true" />Auto-assign</button>
                <span className="muted" style={{ fontSize: 13 }}>or pick someone</span>
                <div className="input-group grow" style={{ minWidth: 260 }}>
                  <label htmlFor="agent-select" className="sr-only">Agent</label>
                  <select id="agent-select" className="input" value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
                    <option value="">Choose an agent…</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}, {a.homeZone?.name || "no zone"}{a.isAvailable ? "" : " (off duty)"}</option>
                    ))}
                  </select>
                  <button className="btn btn-ghost" disabled={busy} onClick={assign}><UserPlus aria-hidden="true" />Assign</button>
                </div>
              </div>
            ) : (
              <p className="soft">{order.assignedAgent ? `With ${order.assignedAgent.name}.` : "No agent on this order."}</p>
            )}
            <details style={{ marginTop: 16 }}>
              <summary className="link-btn" style={{ listStyle: "none" }}><ShieldAlert size={14} style={{ verticalAlign: -2 }} /> Correct the status manually</summary>
              <div className="input-group" style={{ marginTop: 10, maxWidth: 440 }}>
                <label htmlFor="override" className="sr-only">New status</label>
                <select id="override" className="input" value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)}>
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </select>
                <button className="btn btn-danger-ghost" disabled={busy || overrideStatus === order.status} onClick={override}>Change</button>
              </div>
              <p className="hint" style={{ marginTop: 6 }}>Skips the normal flow. The change is still recorded in the history.</p>
            </details>
          </section>
        )}

        <div className="layout-2">
          <div className="stack">
            <section className="card">
              <div className="card-head"><h2>Parcel</h2></div>
              <dl className="facts">
                <div><dt>Size</dt><dd>{order.lengthCm} × {order.breadthCm} × {order.heightCm} cm</dd></div>
                <div><dt>Weight</dt><dd>{order.actualWeightKg} kg</dd></div>
                <div><dt>Charged on</dt><dd>{order.billableWeightKg} kg</dd></div>
                <div><dt>Type</dt><dd>{order.orderType === "B2B" ? "Business" : "Personal"}</dd></div>
                <div><dt>Payment</dt><dd>{order.paymentType === "COD" ? "Cash on delivery" : "Prepaid"}</dd></div>
                <div><dt>Route</dt><dd>{order.zoneType === "INTRA" ? "Same zone" : "Across zones"}</dd></div>
              </dl>
              <hr className="divider" />
              <div className="ledger">
                <div className="line"><span>Base charge</span><span>{money(order.baseCharge)}</span></div>
                <div className="line"><span>Weight charge</span><span>{money(order.weightCharge)}</span></div>
                {order.codSurcharge > 0 && <div className="line"><span>Cash on delivery fee</span><span>{money(order.codSurcharge)}</span></div>}
                <div className="total"><span>Total</span><strong>{money(order.totalCharge)}</strong></div>
              </div>
            </section>

            <section className="card">
              <div className="card-head"><h2>People</h2></div>
              <div className="cols-2">
                <div>
                  <div className="label">Customer</div>
                  <p style={{ fontWeight: 600, marginTop: 4 }}>{order.customer?.name}</p>
                  <p className="muted" style={{ fontSize: 13 }}>{order.customer?.email}</p>
                  {user.role !== "CUSTOMER" && order.customer?.phone && <a href={`tel:${order.customer.phone}`} style={{ fontSize: 13 }}>{order.customer.phone}</a>}
                </div>
                <div>
                  <div className="label">Delivery agent</div>
                  <p style={{ fontWeight: 600, marginTop: 4 }}>{order.assignedAgent?.name || "Not assigned yet"}</p>
                  {order.assignedAgent?.phone && <a href={`tel:${order.assignedAgent.phone}`} style={{ fontSize: 13 }}>{order.assignedAgent.phone}</a>}
                </div>
              </div>
            </section>

            {(customerCanCancel || adminCanCancel) && (
              <button className="btn btn-danger-ghost" disabled={busy} onClick={cancel}><Ban aria-hidden="true" />Cancel order</button>
            )}
          </div>

          <section className="card">
            <div className="card-head">
              <h2>History</h2>
              <button className="link-btn" onClick={() => { navigator.clipboard?.writeText(order.orderNumber); toast("Order number copied."); }}>
                <Copy size={13} style={{ verticalAlign: -2 }} /> <span className="code">{order.orderNumber}</span>
              </button>
            </div>
            <Timeline history={order.trackingHistory} />
          </section>
        </div>
      </div>
    </Layout>
  );
}
