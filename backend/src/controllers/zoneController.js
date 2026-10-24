const { Op } = require("sequelize");
const { Zone, Area, User, Order } = require("../models");

async function listZones(req, res) {
  const zones = await Zone.findAll({
    include: [
      { model: Area, as: "areas" },
      { model: User, as: "agents", attributes: ["id", "name", "email"] },
    ],
    order: [["name", "ASC"]],
  });
  res.json({ zones });
}

async function createZone(req, res) {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const zone = await Zone.create({ name });
    res.status(201).json({ zone });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Zone name already exists" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to create zone" });
  }
}

/**
 * Deleting a zone used to silently cascade-delete all its pincodes and null
 * out the zone on existing orders and agents. Refuse instead, and say why.
 */
async function deleteZone(req, res) {
  const { id } = req.params;
  const zone = await Zone.findByPk(id);
  if (!zone) return res.status(404).json({ error: "Zone not found" });

  const [areas, agents, orders] = await Promise.all([
    Area.count({ where: { zoneId: id } }),
    User.count({ where: { homeZoneId: id } }),
    Order.count({ where: { [Op.or]: [{ pickupZoneId: id }, { dropZoneId: id }] } }),
  ]);
  const blockers = [];
  if (areas) blockers.push(`${areas} pincode(s)`);
  if (agents) blockers.push(`${agents} agent(s)`);
  if (orders) blockers.push(`${orders} order(s)`);
  if (blockers.length) {
    return res.status(409).json({ error: `Can't delete ${zone.name}: it still has ${blockers.join(", ")}. Move or remove them first.` });
  }
  await zone.destroy();
  res.json({ ok: true });
}

/** Assign a pincode (area) to a zone. Upserts so re-assigning a pincode just moves it. */
async function assignArea(req, res) {
  const { zoneId } = req.body;
  const pincode = String(req.body.pincode || "").trim();
  if (!pincode || !zoneId) return res.status(400).json({ error: "pincode and zoneId are required" });
  if (!/^\d{6}$/.test(pincode)) return res.status(400).json({ error: "Pincode must be 6 digits" });

  const zone = await Zone.findByPk(zoneId);
  if (!zone) return res.status(404).json({ error: "Zone not found" });

  const existing = await Area.findOne({ where: { pincode: String(pincode) } });
  let area;
  if (existing) {
    existing.zoneId = zoneId;
    area = await existing.save();
  } else {
    area = await Area.create({ pincode: String(pincode), zoneId });
  }
  res.status(201).json({ area });
}

async function removeArea(req, res) {
  const { id } = req.params;
  const area = await Area.findByPk(id);
  if (!area) return res.status(404).json({ error: "Area not found" });
  await area.destroy();
  res.json({ ok: true });
}

module.exports = { listZones, createZone, deleteZone, assignArea, removeArea };
