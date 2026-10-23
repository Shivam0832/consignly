// Mirrors backend/src/utils/constants.js — keep the two in sync.
export const ALL_STATUSES = [
  "PLACED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY",
  "DELIVERED", "FAILED", "RESCHEDULED", "CANCELLED",
];

// The happy path, used for progress.
export const DELIVERY_STEPS = ["PLACED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];

// What an agent may do next from each status (backend AGENT_TRANSITIONS).
export const AGENT_TRANSITIONS = {
  ASSIGNED: ["PICKED_UP"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
};

export const ASSIGNABLE = ["PLACED", "RESCHEDULED"];
export const CUSTOMER_CANCELLABLE = ["PLACED", "ASSIGNED", "RESCHEDULED"];
export const TERMINAL = ["DELIVERED", "CANCELLED"];

const LABELS = {
  PLACED: "Booked",
  ASSIGNED: "Agent assigned",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  FAILED: "Delivery failed",
  RESCHEDULED: "Rescheduled",
  CANCELLED: "Cancelled",
};
export const label = (s) => LABELS[s] || (s || "").replace(/_/g, " ").toLowerCase();

// Short, human sentence for the current state, from the customer's view.
const HEADLINES = {
  PLACED: "Booked, waiting for an agent",
  ASSIGNED: "An agent is on the way to pick up",
  PICKED_UP: "Picked up from the sender",
  IN_TRANSIT: "On the move between zones",
  OUT_FOR_DELIVERY: "Out for delivery today",
  DELIVERED: "Delivered",
  FAILED: "Delivery attempt failed",
  RESCHEDULED: "Rescheduled, finding a new agent",
  CANCELLED: "Cancelled",
};
export const headline = (s) => HEADLINES[s] || label(s);

export const TONE = {
  PLACED: "wait", RESCHEDULED: "wait",
  ASSIGNED: "move", PICKED_UP: "move", IN_TRANSIT: "move", OUT_FOR_DELIVERY: "move",
  DELIVERED: "ok", FAILED: "bad", CANCELLED: "bad",
};

/** 0–1 position along the route for the waybill truck. */
export function progress(status, history = []) {
  if (status === "DELIVERED") return 1;
  const reached = Math.max(0, ...history.map((h) => DELIVERY_STEPS.indexOf(h.status)), DELIVERY_STEPS.indexOf(status));
  return Math.min(1, reached / (DELIVERY_STEPS.length - 1));
}

export const money = (n) => {
  const v = Number(n || 0);
  const digits = Number.isInteger(v) ? 0 : 2;
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const when = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const day = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function relative(d) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} d ago`;
  return day(d);
}
