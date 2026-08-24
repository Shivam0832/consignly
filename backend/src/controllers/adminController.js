const bcrypt = require("bcryptjs");
const { User, Order, Zone } = require("../models");
const { ROLES } = require("../utils/constants");
const { publicUser } = require("./authController");

/** Admin creates AGENT or ADMIN accounts (customers self-register). */
async function createUser(req, res) {
  const { name, email, password, phone, role, homeZoneId } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password, role are required" });
  }
  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ error: `role must be one of ${Object.values(ROLES).join(", ")}` });
  }
  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hash, phone, role, homeZoneId: homeZoneId || null });
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
  if (!user) return res.status(404).json({ error: "User not found" });

  if (isAvailable !== undefined) user.isAvailable = Boolean(isAvailable);
  if (currentLat !== undefined) user.currentLat = Number(currentLat);
  if (currentLng !== undefined) user.currentLng = Number(currentLng);
  if (homeZoneId !== undefined && req.user.role === ROLES.ADMIN) user.homeZoneId = homeZoneId;

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

  res.json({ totalOrders, statusCounts, totalAgents, availableAgents, totalCustomers });
}

module.exports = { createUser, listUsers, updateAgentStatus, dashboardStats };
