const { Op } = require("sequelize");
const { Order, User, Zone, TrackingHistory } = require("../models");
const { calculateCharge, RateEngineError } = require("../utils/rateEngine");
const { findBestAgent } = require("../utils/assignment");
const { orderStatusChanged } = require("../utils/notify");
const { ROLES, ORDER_STATUS, ALLOWED_TRANSITIONS, ORDER_TYPES, PAYMENT_TYPES } = require("../utils/constants");

function genOrderNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LM-${ts}-${rand}`;
}

/** Append one immutable row to TrackingHistory. Never update/delete these rows. */
async function logHistory(orderId, status, actor, note) {
  return TrackingHistory.create({
    orderId,
    status,
    note: note || null,
    actorId: actor?.id || null,
    actorRole: actor?.role || "SYSTEM",
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
    console.error(err);
    res.status(500).json({ error: "Failed to calculate charge" });
  }
}

// --------------------------------------------------------------------------
// POST /api/orders  — create an order.
// --------------------------------------------------------------------------
async function createOrder(req, res) {
  try {
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
      return res.status(400).json({ error: `orderType must be one of ${Object.values(ORDER_TYPES).join(", ")}` });
    }
    if (!Object.values(PAYMENT_TYPES).includes(paymentType)) {
      return res.status(400).json({ error: `paymentType must be one of ${Object.values(PAYMENT_TYPES).join(", ")}` });
    }
    if (!pickupAddress || !dropAddress) {
      return res.status(400).json({ error: "pickupAddress and dropAddress are required" });
    }

    let customerId = req.user.role === ROLES.CUSTOMER ? req.user.id : bodyCustomerId;
    if (req.user.role === ROLES.ADMIN && !customerId && customerEmail) {
      const cust = await User.findOne({ where: { email: customerEmail } });
      if (!cust) return res.status(404).json({ error: `No customer found with email ${customerEmail}` });
      customerId = cust.id;
    }
    if (!customerId) return res.status(400).json({ error: "customerId or customerEmail is required" });

    const customer = await User.findByPk(customerId);
    if (!customer || customer.role !== ROLES.CUSTOMER) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const quote = await calculateCharge({
      pickupPincode,
      dropPincode,
      lengthCm,
      breadthCm,
      heightCm,
      actualWeightKg,
      orderType,
      paymentType,
    });

    const order = await Order.create({
      orderNumber: genOrderNumber(),
      customerId,
      createdByAdminId: req.user.role === ROLES.ADMIN ? req.user.id : null,
      pickupAddress,
      pickupPincode: String(pickupPincode),
      pickupZoneId: quote.pickupZone.id,
      dropAddress,
      dropPincode: String(dropPincode),
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
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
    });

    await logHistory(order.id, ORDER_STATUS.PLACED, req.user, "Order placed");
    await orderStatusChanged(order, customer);

    if (autoAssign) {
      await runAutoAssign(order.id, req.user);
    }

    const fresh = await getOrderWithRelations(order.id);
    res.status(201).json({ order: fresh });
  } catch (err) {
    if (err instanceof RateEngineError) return res.status(422).json({ error: err.message, code: err.code });
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
}

async function getOrderWithRelations(id) {
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
// GET /api/orders  — list with filters (status/zone/agent), role-scoped.
// --------------------------------------------------------------------------
async function listOrders(req, res) {
  const { status, zoneId, agentId, orderType, paymentType } = req.query;
  const where = {};

  if (req.user.role === ROLES.CUSTOMER) where.customerId = req.user.id;
  if (req.user.role === ROLES.AGENT) where.assignedAgentId = req.user.id;

  if (status) where.status = status;
  if (orderType) where.orderType = orderType;
  if (paymentType) where.paymentType = paymentType;
  if (agentId && req.user.role === ROLES.ADMIN) where.assignedAgentId = agentId;
  if (zoneId) where[Op.or] = [{ pickupZoneId: zoneId }, { dropZoneId: zoneId }];

  const orders = await Order.findAll({
    where,
    include: [
      { model: User, as: "customer", attributes: ["id", "name", "email"] },
      { model: User, as: "assignedAgent", attributes: ["id", "name", "email"] },
      { model: Zone, as: "pickupZone" },
      { model: Zone, as: "dropZone" },
    ],
    order: [["createdAt", "DESC"]],
  });
  res.json({ orders });
}

async function getOrder(req, res) {
  const order = await getOrderWithRelations(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  if (req.user.role === ROLES.CUSTOMER && order.customerId !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (req.user.role === ROLES.AGENT && order.assignedAgentId !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json({ order });
}

// --------------------------------------------------------------------------
// Manual assignment (admin) & auto-assignment
// --------------------------------------------------------------------------
async function manualAssign(req, res) {
  const { id } = req.params;
  const { agentId } = req.body;

  const order = await Order.findByPk(id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const agent = await User.findByPk(agentId);
  if (!agent || agent.role !== ROLES.AGENT) return res.status(404).json({ error: "Agent not found" });

  if (![ORDER_STATUS.PLACED, ORDER_STATUS.RESCHEDULED].includes(order.status)) {
    return res.status(409).json({ error: `Cannot assign an order in status ${order.status}` });
  }

  order.assignedAgentId = agent.id;
  order.status = ORDER_STATUS.ASSIGNED;
  await order.save();
  await logHistory(id, ORDER_STATUS.ASSIGNED, req.user, `Manually assigned to agent ${agent.name}`);

  const customer = await User.findByPk(order.customerId);
  await orderStatusChanged(order, customer);

  res.json({ order: await getOrderWithRelations(id) });
}

async function runAutoAssign(orderId, actor) {
  const order = await Order.findByPk(orderId);
  if (!order) throw new Error("Order not found");
  if (!order.pickupZoneId) throw new Error("Order has no pickup zone");

  const { agent, method, widenedSearch } = await findBestAgent(order.pickupZoneId, {});
  if (!agent) return { order, agent: null };

  order.assignedAgentId = agent.id;
  order.status = ORDER_STATUS.ASSIGNED;
  await order.save();
  await logHistory(
    orderId,
    ORDER_STATUS.ASSIGNED,
    actor,
    `Auto-assigned to ${agent.name} (${method}${widenedSearch ? ", widened beyond home zone" : ""})`
  );

  const customer = await User.findByPk(order.customerId);
  await orderStatusChanged(order, customer);
  return { order, agent };
}

async function autoAssignEndpoint(req, res) {
  try {
    const { order, agent } = await runAutoAssign(req.params.id, req.user);
    if (!agent) return res.status(409).json({ error: "No available agent found for this order's zone" });
    res.json({ order: await getOrderWithRelations(order.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Auto-assignment failed" });
  }
}

// --------------------------------------------------------------------------
// PATCH /api/orders/:id/status
// --------------------------------------------------------------------------
async function updateStatus(req, res) {
  const { id } = req.params;
  const { status, note, failureReason } = req.body;

  const order = await Order.findByPk(id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  if (req.user.role === ROLES.AGENT) {
    if (order.assignedAgentId !== req.user.id) {
      return res.status(403).json({ error: "You are not assigned to this order" });
    }
    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(409).json({ error: `Cannot move order from ${order.status} to ${status}` });
    }
  }
  if (req.user.role === ROLES.CUSTOMER) {
    return res.status(403).json({ error: "Customers cannot change order status" });
  }

  order.status = status;
  if (status === ORDER_STATUS.FAILED) order.failureReason = failureReason || note || "Delivery attempt failed";
  await order.save();
  await logHistory(id, status, req.user, note);

  const customer = await User.findByPk(order.customerId);
  await orderStatusChanged(order, customer);

  res.json({ order: await getOrderWithRelations(id) });
}

// --------------------------------------------------------------------------
// POST /api/orders/:id/reschedule
// --------------------------------------------------------------------------
async function reschedule(req, res) {
  const { id } = req.params;
  const { newDate, autoAssign } = req.body;

  const order = await Order.findByPk(id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  if (req.user.role === ROLES.CUSTOMER && order.customerId !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (order.status !== ORDER_STATUS.FAILED) {
    return res.status(409).json({ error: "Only a FAILED order can be rescheduled" });
  }
  if (!newDate) return res.status(400).json({ error: "newDate is required" });

  order.status = ORDER_STATUS.RESCHEDULED;
  order.scheduledDate = new Date(newDate);
  order.assignedAgentId = null;
  await order.save();
  await logHistory(id, ORDER_STATUS.RESCHEDULED, req.user, `Rescheduled to ${new Date(newDate).toDateString()}`);

  const customer = await User.findByPk(order.customerId);
  await orderStatusChanged(order, customer);

  if (autoAssign) {
    await runAutoAssign(id, req.user);
  }

  res.json({ order: await getOrderWithRelations(id) });
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
};
