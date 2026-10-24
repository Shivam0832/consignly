const { Op } = require("sequelize");
const { sequelize, Order, User, Zone, TrackingHistory } = require("../models");
const { calculateCharge, RateEngineError } = require("../utils/rateEngine");
const { findBestAgent } = require("../utils/assignment");
const { orderStatusChanged } = require("../utils/notify");
const { HttpError } = require("../utils/asyncHandler");
const {
  ROLES,
  ORDER_STATUS,
  AGENT_TRANSITIONS,
  ASSIGNABLE_STATUSES,
  CUSTOMER_CANCELLABLE,
  ORDER_TYPES,
  PAYMENT_TYPES,
} = require("../utils/constants");

const TERMINAL_STATUSES = [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED];

function genOrderNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LM-${ts}-${rand}`;
}

/**
 * Parse a YYYY-MM-DD (or ISO) date coming from a form. Rejects garbage and
 * dates before today, so "Invalid date" or last year's date never reaches
 * the database.
 */
function parseFutureDate(value, field) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) throw new HttpError(400, `${field} must be a valid date`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (d < today) throw new HttpError(400, `${field} cannot be in the past`);
  return d;
}

/**
 * Save an order change and append its one immutable TrackingHistory row in a
 * single transaction, so the audit trail can never disagree with the order.
 */
async function saveWithHistory(order, actor, note) {
  await sequelize.transaction(async (transaction) => {
    await order.save({ transaction });
    await TrackingHistory.create(
      {
        orderId: order.id,
        status: order.status,
        note: note || null,
        actorId: actor?.id || null,
        actorRole: actor?.role || "SYSTEM",
      },
      { transaction }
    );
  });
}

/**
 * Notify the customer without making the API response wait on SMTP. Delivery
 * results are still recorded in the Notification table by notify.js.
 */
function notifyCustomer(order) {
  // Snapshot now: the same order object may move on (e.g. PLACED -> ASSIGNED)
  // before the background lookup below resolves.
  const snapshot = order.get({ plain: true });
  User.findByPk(snapshot.customerId)
    .then((customer) => customer && orderStatusChanged(snapshot, customer))
    .catch((err) => console.error("[NOTIFY] failed for order", order.orderNumber, err.message));
}

async function findOrderOr404(id) {
  const order = await Order.findByPk(id);
  if (!order) throw new HttpError(404, "Order not found");
  return order;
}

function getOrderWithRelations(id) {
  return Order.findByPk(id, {
    include: [
      { model: User, as: "customer", attributes: ["id", "name", "email", "phone"] },
      { model: User, as: "assignedAgent", attributes: ["id", "name", "email", "phone"] },
      { model: Zone, as: "pickupZone" },
      { model: Zone, as: "dropZone" },
      { model: TrackingHistory, as: "trackingHistory", separate: true, order: [["createdAt", "ASC"]] },
    ],
  });
}

// --------------------------------------------------------------------------
// POST /api/orders/calculate  — price preview, no order created.
// --------------------------------------------------------------------------
async function calculatePreview(req, res) {
  try {
    const quote = await calculateCharge(req.body);
    res.json({ quote });
  } catch (err) {
    if (err instanceof RateEngineError) return res.status(422).json({ error: err.message, code: err.code });
    throw err;
  }
}

// --------------------------------------------------------------------------
// POST /api/orders  — create an order.
// --------------------------------------------------------------------------
async function createOrder(req, res) {
  const {
    customerId: bodyCustomerId,
    customerEmail,
    pickupAddress,
    pickupPincode,
    dropAddress,
    dropPincode,
    lengthCm,
    breadthCm,
    heightCm,
    actualWeightKg,
    orderType,
    paymentType,
    scheduledDate,
    autoAssign,
  } = req.body;

  if (!Object.values(ORDER_TYPES).includes(orderType)) {
    throw new HttpError(400, `orderType must be one of ${Object.values(ORDER_TYPES).join(", ")}`);
  }
  if (!Object.values(PAYMENT_TYPES).includes(paymentType)) {
    throw new HttpError(400, `paymentType must be one of ${Object.values(PAYMENT_TYPES).join(", ")}`);
  }
  if (!String(pickupAddress || "").trim() || !String(dropAddress || "").trim()) {
    throw new HttpError(400, "pickupAddress and dropAddress are required");
  }
  const schedule = scheduledDate ? parseFutureDate(scheduledDate, "scheduledDate") : null;

  const isAdmin = req.user.role === ROLES.ADMIN;
  let customerId = isAdmin ? bodyCustomerId : req.user.id;
  if (isAdmin && !customerId && customerEmail) {
    const cust = await User.findOne({ where: { email: String(customerEmail).trim().toLowerCase() } });
    if (!cust) throw new HttpError(404, `No customer found with email ${customerEmail}`);
    customerId = cust.id;
  }
  if (!customerId) throw new HttpError(400, "customerId or customerEmail is required");

  const customer = await User.findByPk(customerId);
  if (!customer || customer.role !== ROLES.CUSTOMER) throw new HttpError(404, "Customer not found");

  let quote;
  try {
    quote = await calculateCharge({
      pickupPincode, dropPincode, lengthCm, breadthCm, heightCm, actualWeightKg, orderType, paymentType,
    });
  } catch (err) {
    if (err instanceof RateEngineError) return res.status(422).json({ error: err.message, code: err.code });
    throw err;
  }

  const order = Order.build({
    orderNumber: genOrderNumber(),
    customerId,
    createdByAdminId: isAdmin ? req.user.id : null,
    pickupAddress: String(pickupAddress).trim(),
    pickupPincode: String(pickupPincode).trim(),
    pickupZoneId: quote.pickupZone.id,
    dropAddress: String(dropAddress).trim(),
    dropPincode: String(dropPincode).trim(),
    dropZoneId: quote.dropZone.id,
    lengthCm: Number(lengthCm),
    breadthCm: Number(breadthCm),
    heightCm: Number(heightCm),
    actualWeightKg: Number(actualWeightKg),
    volumetricWeightKg: quote.volumetricWeightKg,
    billableWeightKg: quote.billableWeightKg,
    orderType,
    paymentType,
    zoneType: quote.zoneType,
    baseCharge: quote.baseCharge,
    weightCharge: quote.weightCharge,
    codSurcharge: quote.codSurcharge,
    totalCharge: quote.totalCharge,
    status: ORDER_STATUS.PLACED,
    scheduledDate: schedule,
  });
  await saveWithHistory(order, req.user, "Order placed");
  notifyCustomer(order);

  // Dispatch is an operations decision, so only admins can auto-assign at
  // creation time. Customer orders wait for an admin (or a later auto-assign).
  let assignment = null;
  if (autoAssign && isAdmin) assignment = await runAutoAssign(order, req.user);

  res.status(201).json({ order: await getOrderWithRelations(order.id), assignment: summarize(assignment) });
}

function summarize(result) {
  if (!result) return null;
  return {
    assigned: Boolean(result.agent),
    agentName: result.agent?.name || null,
    method: result.method || null,
    widenedSearch: Boolean(result.widenedSearch),
  };
}

// --------------------------------------------------------------------------
// GET /api/orders  — list with filters, role-scoped, paginated.
// --------------------------------------------------------------------------
async function listOrders(req, res) {
  const { status, zoneId, agentId, orderType, paymentType, q } = req.query;
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const where = {};

  if (req.user.role === ROLES.CUSTOMER) where.customerId = req.user.id;
  if (req.user.role === ROLES.AGENT) where.assignedAgentId = req.user.id;

  if (status) where.status = status;
  if (orderType) where.orderType = orderType;
  if (paymentType) where.paymentType = paymentType;
  if (agentId && req.user.role === ROLES.ADMIN) where.assignedAgentId = agentId;
  if (zoneId) where[Op.or] = [{ pickupZoneId: zoneId }, { dropZoneId: zoneId }];
  if (q) where.orderNumber = { [Op.like]: `%${String(q).trim().toUpperCase()}%` };

  const { rows, count } = await Order.findAndCountAll({
    where,
    include: [
      { model: User, as: "customer", attributes: ["id", "name", "email"] },
      { model: User, as: "assignedAgent", attributes: ["id", "name", "email"] },
      { model: Zone, as: "pickupZone" },
      { model: Zone, as: "dropZone" },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    distinct: true,
  });
  res.json({ orders: rows, total: count, limit, offset });
}

async function getOrder(req, res) {
  const order = await getOrderWithRelations(req.params.id);
  if (!order) throw new HttpError(404, "Order not found");

  if (req.user.role === ROLES.CUSTOMER && order.customerId !== req.user.id) throw new HttpError(403, "Forbidden");
  if (req.user.role === ROLES.AGENT && order.assignedAgentId !== req.user.id) throw new HttpError(403, "Forbidden");
  res.json({ order });
}

// --------------------------------------------------------------------------
// Manual assignment (admin) & auto-assignment
// --------------------------------------------------------------------------
async function manualAssign(req, res) {
  const order = await findOrderOr404(req.params.id);
  const { agentId } = req.body;
  if (!agentId) throw new HttpError(400, "agentId is required");

  const agent = await User.findByPk(agentId);
  if (!agent || agent.role !== ROLES.AGENT) throw new HttpError(404, "Agent not found");
  if (!ASSIGNABLE_STATUSES.includes(order.status)) {
    throw new HttpError(409, `Cannot assign an order in status ${order.status}`);
  }

  order.assignedAgentId = agent.id;
  order.status = ORDER_STATUS.ASSIGNED;
  await saveWithHistory(order, req.user, `Manually assigned to agent ${agent.name}`);
  notifyCustomer(order);

  res.json({ order: await getOrderWithRelations(order.id) });
}

/**
 * Pick and assign the best available agent. Only runs for orders that are
 * waiting for an agent (PLACED / RESCHEDULED) — never re-opens a delivered,
 * cancelled or in-flight order.
 */
async function runAutoAssign(order, actor) {
  if (!ASSIGNABLE_STATUSES.includes(order.status)) {
    throw new HttpError(409, `Cannot auto-assign an order in status ${order.status}`);
  }
  if (!order.pickupZoneId) throw new HttpError(409, "Order has no pickup zone");

  const result = await findBestAgent(order.pickupZoneId, {});
  if (!result.agent) return result;

  order.assignedAgentId = result.agent.id;
  order.status = ORDER_STATUS.ASSIGNED;
  const how = result.method === "GPS_NEAREST" ? "nearest by GPS" : "least busy in zone";
  await saveWithHistory(
    order,
    actor,
    `Auto-assigned to ${result.agent.name} (${how}${result.widenedSearch ? ", widened beyond home zone" : ""})`
  );
  notifyCustomer(order);
  return result;
}

async function autoAssignEndpoint(req, res) {
  const order = await findOrderOr404(req.params.id);
  const result = await runAutoAssign(order, req.user);
  if (!result.agent) throw new HttpError(409, "No available agent found for this order's zone");
  res.json({ order: await getOrderWithRelations(order.id), assignment: summarize(result) });
}

// --------------------------------------------------------------------------
// PATCH /api/orders/:id/status
// --------------------------------------------------------------------------
async function updateStatus(req, res) {
  const { status, note, failureReason } = req.body;
  if (!Object.values(ORDER_STATUS).includes(status)) {
    throw new HttpError(400, `status must be one of ${Object.values(ORDER_STATUS).join(", ")}`);
  }

  const order = await findOrderOr404(req.params.id);
  if (order.status === status) throw new HttpError(409, `Order is already ${status}`);

  if (req.user.role === ROLES.AGENT) {
    if (order.assignedAgentId !== req.user.id) throw new HttpError(403, "You are not assigned to this order");
    const allowed = AGENT_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      throw new HttpError(409, `Cannot move order from ${order.status} to ${status}`);
    }
  } else if (req.user.role !== ROLES.ADMIN) {
    throw new HttpError(403, "Only agents and admins can change order status");
  }

  // Admin overrides may skip steps, but an ASSIGNED order must have an agent.
  if (status === ORDER_STATUS.ASSIGNED && !order.assignedAgentId) {
    throw new HttpError(409, "Use Assign / Auto-assign to give this order an agent");
  }

  order.status = status;
  if (status === ORDER_STATUS.FAILED) {
    order.failureReason = String(failureReason || note || "Delivery attempt failed").slice(0, 250);
  }
  const auditNote = note || (req.user.role === ROLES.ADMIN ? "Admin override" : null);
  await saveWithHistory(order, req.user, status === ORDER_STATUS.FAILED ? order.failureReason : auditNote);
  notifyCustomer(order);

  res.json({ order: await getOrderWithRelations(order.id) });
}

// --------------------------------------------------------------------------
// POST /api/orders/:id/reschedule
// --------------------------------------------------------------------------
async function reschedule(req, res) {
  const { newDate, autoAssign } = req.body;
  const order = await findOrderOr404(req.params.id);

  if (req.user.role === ROLES.CUSTOMER && order.customerId !== req.user.id) throw new HttpError(403, "Forbidden");
  if (order.status !== ORDER_STATUS.FAILED) throw new HttpError(409, "Only a FAILED order can be rescheduled");
  const date = parseFutureDate(newDate, "newDate");

  order.status = ORDER_STATUS.RESCHEDULED;
  order.scheduledDate = date;
  order.assignedAgentId = null;
  await saveWithHistory(order, req.user, `Rescheduled to ${date.toDateString()}`);
  notifyCustomer(order);

  let assignment = null;
  if (autoAssign) assignment = await runAutoAssign(order, req.user);

  res.json({ order: await getOrderWithRelations(order.id), assignment: summarize(assignment) });
}

// --------------------------------------------------------------------------
// POST /api/orders/:id/cancel — customer (own order, before pickup) or admin.
// --------------------------------------------------------------------------
async function cancelOrder(req, res) {
  const order = await findOrderOr404(req.params.id);
  const reason = String(req.body?.reason || "").trim().slice(0, 200);

  if (req.user.role === ROLES.CUSTOMER) {
    if (order.customerId !== req.user.id) throw new HttpError(403, "Forbidden");
    if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
      throw new HttpError(409, "This order has already been picked up and can no longer be cancelled");
    }
  } else if (TERMINAL_STATUSES.includes(order.status)) {
    throw new HttpError(409, `Order is already ${order.status}`);
  }

  order.status = ORDER_STATUS.CANCELLED;
  await saveWithHistory(order, req.user, reason ? `Cancelled: ${reason}` : "Cancelled");
  notifyCustomer(order);

  res.json({ order: await getOrderWithRelations(order.id) });
}

module.exports = {
  calculatePreview,
  createOrder,
  listOrders,
  getOrder,
  manualAssign,
  autoAssignEndpoint,
  updateStatus,
  reschedule,
  cancelOrder,
};
