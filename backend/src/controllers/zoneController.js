const { Zone, Area, User } = require("../models");

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
  const { name } = req.body;
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

async function deleteZone(req, res) {
  const { id } = req.params;
  try {
    const zone = await Zone.findByPk(id);
    if (!zone) return res.status(404).json({ error: "Zone not found" });
    await zone.destroy();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Could not delete zone (it may still have areas/agents attached)" });
  }
}

/** Assign a pincode (area) to a zone. Upserts so re-assigning a pincode just moves it. */
async function assignArea(req, res) {
  const { pincode, zoneId } = req.body;
  if (!pincode || !zoneId) return res.status(400).json({ error: "pincode and zoneId are required" });

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
