// Mirrors backend/src/utils/constants.js — keep the two in sync.
export const ALL_STATUSES = [
  "PLACED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY",
  "DELIVERED", "FAILED", "RESCHEDULED", "CANCELLED",
];

// The happy path, used for the progress tracker.
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

export const label = (s) => (s || "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export const money = (n) => {
  const v = Number(n || 0);
  const digits = Number.isInteger(v) ? 0 : 2;
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
