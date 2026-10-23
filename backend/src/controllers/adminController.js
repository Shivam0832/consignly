const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { User, Order, Zone } = require("../models");
const { ROLES } = require("../utils/constants");
const { publicUser, normalizeEmail, MIN_PASSWORD } = require("./authController");
const { HttpError } = require("../utils/asyncHandler");

async function assertZone(zoneId) {
  if (!zoneId) return null;
  const zone = await Zone.findByPk(zoneId);
  if (!zone) throw new HttpError(400, "homeZoneId does not match any zone");
  return zone.id;
}

/** Admin creates AGENT or ADMIN accounts (customers self-register). */
async function createUser(req, res) {
  const { name, password, phone, role, homeZoneId } = req.body;
  const email = normalizeEmail(req.body.email);
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password, role are required" });
  }
  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ error: `role must be one of ${Object.values(ROLES).join(", ")}` });
  }
  if (String(password).length < MIN_PASSWORD) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
  }
  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const hash = await bcrypt.hash(String(password), 10);
  const user = await User.create({
    name: String(name).trim(),
    email,
    password: hash,
    phone: phone || null,
    role,
    homeZoneId: await assertZone(homeZoneId),
  });
  res.status(201).json({ user: publicUser(user) });
}

async function listUsers(req, res) {
  const { role } = req.query;
  const where = role ? { role } : {};
  const users = await User.findAll({
    where,
    attributes: { exclude: ["password"] },
    include: [{ model: Zone, as: "homeZone" }],
    order: [["createdAt", "DESC"]],
  });
  res.json({ users });
}

/** Agent (or admin on agent's behalf) updates availability / live location. */
async function updateAgentStatus(req, res) {
  const { id } = req.params;
  const { isAvailable, currentLat, currentLng, homeZoneId } = req.body;

  if (req.user.role === ROLES.AGENT && req.user.id !== id) {
    return res.status(403).json({ error: "Agents can only update their own status" });
  }

  const user = await User.findByPk(id);
  if (!user || user.role !== ROLES.AGENT) return res.status(404).json({ error: "Agent not found" });

  const coord = (v, max, label) => {
    if (v === null) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || Math.abs(n) > max) throw new HttpError(400, `${label} must be a number between -${max} and ${max}`);
    return n;
  };
  if (isAvailable !== undefined) user.isAvailable = isAvailable === true || isAvailable === "true";
  if (currentLat !== undefined) user.currentLat = coord(currentLat, 90, "currentLat");
  if (currentLng !== undefined) user.currentLng = coord(currentLng, 180, "currentLng");
  if (homeZoneId !== undefined && req.user.role === ROLES.ADMIN) user.homeZoneId = await assertZone(homeZoneId);

  await user.save();
  res.json({ user: publicUser(user) });
}

/** Simple dashboard summary counts for the admin home screen. */
async function dashboardStats(req, res) {
  const [totalOrders, statusRows, totalAgents, availableAgents, totalCustomers] = await Promise.all([
    Order.count(),
    Order.findAll({ attributes: ["status", [Order.sequelize.fn("COUNT", "*"), "count"]], group: ["status"], raw: true }),
    User.count({ where: { role: ROLES.AGENT } }),
    User.count({ where: { role: ROLES.AGENT, isAvailable: true } }),
    User.count({ where: { role: ROLES.CUSTOMER } }),
  ]);

  const statusCounts = {};
  statusRows.forEach((row) => (statusCounts[row.status] = Number(row.count)));

  // Last 14 days (UTC), oldest first: orders booked and revenue per day.
  const DAYS = 14;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (DAYS - 1));
  const recent = await Order.findAll({
    where: { createdAt: { [Op.gte]: start } },
    attributes: ["createdAt", "status", "totalCharge"],
    raw: true,
  });
  const daily = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), orders: 0, revenue: 0 };
  });
  for (const o of recent) {
    const day = daily.find((d) => d.date === new Date(o.createdAt).toISOString().slice(0, 10));
    if (!day) continue;
    day.orders += 1;
    if (o.status !== "CANCELLED") day.revenue = Math.round((day.revenue + Number(o.totalCharge)) * 100) / 100;
  }

  res.json({ totalOrders, statusCounts, totalAgents, availableAgents, totalCustomers, daily });
}

module.exports = { createUser, listUsers, updateAgentStatus, dashboardStats };
