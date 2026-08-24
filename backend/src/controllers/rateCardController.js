const { RateCard, CodSurcharge } = require("../models");
const { ORDER_TYPES, ZONE_TYPES, SURCHARGE_TYPES } = require("../utils/constants");

async function listRateCards(req, res) {
  const rateCards = await RateCard.findAll({ order: [["orderType", "ASC"], ["zoneType", "ASC"]] });
  const codSurcharges = await CodSurcharge.findAll();
  res.json({ rateCards, codSurcharges });
}

/** Upsert a rate card for a given (orderType, zoneType) pair. */
async function upsertRateCard(req, res) {
  const { orderType, zoneType, baseCharge, ratePerKg } = req.body;

  if (!Object.values(ORDER_TYPES).includes(orderType)) {
    return res.status(400).json({ error: `orderType must be one of ${Object.values(ORDER_TYPES).join(", ")}` });
  }
  if (!Object.values(ZONE_TYPES).includes(zoneType)) {
    return res.status(400).json({ error: `zoneType must be one of ${Object.values(ZONE_TYPES).join(", ")}` });
  }
  if (ratePerKg === undefined || Number(ratePerKg) < 0) {
    return res.status(400).json({ error: "ratePerKg must be a non-negative number" });
  }

  let rateCard = await RateCard.findOne({ where: { orderType, zoneType } });
  if (rateCard) {
    rateCard.baseCharge = Number(baseCharge) || 0;
    rateCard.ratePerKg = Number(ratePerKg);
    await rateCard.save();
  } else {
    rateCard = await RateCard.create({
      orderType,
      zoneType,
      baseCharge: Number(baseCharge) || 0,
      ratePerKg: Number(ratePerKg),
    });
  }
  res.status(201).json({ rateCard });
}

/** Upsert COD surcharge rule for an order type. */
async function upsertCodSurcharge(req, res) {
  const { orderType, type, value } = req.body;

  if (!Object.values(ORDER_TYPES).includes(orderType)) {
    return res.status(400).json({ error: `orderType must be one of ${Object.values(ORDER_TYPES).join(", ")}` });
  }
  if (!Object.values(SURCHARGE_TYPES).includes(type)) {
    return res.status(400).json({ error: `type must be one of ${Object.values(SURCHARGE_TYPES).join(", ")}` });
  }
  if (value === undefined || Number(value) < 0) {
    return res.status(400).json({ error: "value must be a non-negative number" });
  }

  let codSurcharge = await CodSurcharge.findOne({ where: { orderType } });
  if (codSurcharge) {
    codSurcharge.type = type;
    codSurcharge.value = Number(value);
    await codSurcharge.save();
  } else {
    codSurcharge = await CodSurcharge.create({ orderType, type, value: Number(value) });
  }
  res.status(201).json({ codSurcharge });
}

module.exports = { listRateCards, upsertRateCard, upsertCodSurcharge };
