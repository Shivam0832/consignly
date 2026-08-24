// Central place for all "enum" values. Since the Prisma schema stores these
// as validated strings (for SQLite/Postgres portability), every value used
// anywhere in the app must come from here — this is what "no hardcoding"
// means in practice: change behavior by editing DB rows (rate cards, zones),
// never by editing these lifecycle constants.

const ROLES = Object.freeze({
  CUSTOMER: "CUSTOMER",
  AGENT: "AGENT",
  ADMIN: "ADMIN",
});

const ORDER_TYPES = Object.freeze({
  B2B: "B2B",
  B2C: "B2C",
});

const PAYMENT_TYPES = Object.freeze({
  PREPAID: "PREPAID",
  COD: "COD",
});

const ZONE_TYPES = Object.freeze({
  INTRA: "INTRA",
  INTER: "INTER",
});

const SURCHARGE_TYPES = Object.freeze({
  FLAT: "FLAT",
  PERCENT: "PERCENT",
});

const ORDER_STATUS = Object.freeze({
  PLACED: "PLACED",
  ASSIGNED: "ASSIGNED",
  PICKED_UP: "PICKED_UP",
  IN_TRANSIT: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  RESCHEDULED: "RESCHEDULED",
  CANCELLED: "CANCELLED",
});

// Valid forward transitions. Enforced in orderController so the lifecycle
// can never be corrupted via a stray API call (e.g. PLACED -> DELIVERED).
const ALLOWED_TRANSITIONS = Object.freeze({
  PLACED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  FAILED: ["RESCHEDULED"],
  RESCHEDULED: ["ASSIGNED"],
  CANCELLED: [],
});

const NOTIFICATION_CHANNELS = Object.freeze({
  EMAIL: "EMAIL",
  SMS: "SMS",
});

module.exports = {
  ROLES,
  ORDER_TYPES,
  PAYMENT_TYPES,
  ZONE_TYPES,
  SURCHARGE_TYPES,
  ORDER_STATUS,
  ALLOWED_TRANSITIONS,
  NOTIFICATION_CHANNELS,
};
