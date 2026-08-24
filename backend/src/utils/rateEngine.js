const { Area, RateCard, CodSurcharge } = require("../models");
const { ZONE_TYPES } = require("./constants");

/**
 * RATE CALCULATION ENGINE
 * ------------------------------------------------------------------------
 * Pure, admin-data-driven pricing. No numbers are hardcoded here — every
 * charge component is pulled from the DB (Zone/Area, RateCard, CodSurcharge)
 * so admins can change pricing without a code deploy.
 *
 * Steps:
 *  1. Zone detection      — map pickup & drop pincodes to Zones via Area table.
 *  2. Volumetric weight   — (L * B * H) / 5000  (industry-standard divisor,
 *                            itself admin-configurable via env if desired).
 *  3. Billable weight     — max(actual, volumetric).
 *  4. Zone type            — INTRA if pickupZone === dropZone, else INTER.
 *  5. Rate card lookup     — (orderType, zoneType) -> baseCharge + ratePerKg.
 *  6. COD surcharge        — applied only when paymentType === COD, using
 *                            the FLAT or PERCENT rule configured for that
 *                            orderType.
 * ------------------------------------------------------------------------
 */

const VOLUMETRIC_DIVISOR = Number(process.env.VOLUMETRIC_DIVISOR || 5000);

class RateEngineError extends Error {
  constructor(message, code = "RATE_ENGINE_ERROR") {
    super(message);
    this.code = code;
  }
}

/** Resolve a pincode to its Zone row. Throws if the pincode is not mapped. */
async function detectZone(pincode) {
  const Zone = require("../models").Zone;
  const area = await Area.findOne({
    where: { pincode: String(pincode) },
    include: [{ model: Zone, as: "zone" }],
  });
  if (!area) {
    throw new RateEngineError(
      `Pincode ${pincode} is not mapped to any zone. Ask admin to add it.`,
      "ZONE_NOT_FOUND"
    );
  }
  return area.zone; // { id, name }
}

function calcVolumetricWeight(lengthCm, breadthCm, heightCm) {
  const raw = (Number(lengthCm) * Number(breadthCm) * Number(heightCm)) / VOLUMETRIC_DIVISOR;
  return Math.round(raw * 1000) / 1000; // 3-decimal precision
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Full charge computation. Does NOT persist anything — used both by the
 * "preview before confirm" endpoint and by order creation itself, so the
 * quoted price and the charged price are always computed by the exact same
 * code path (prevents preview/charge drift bugs).
 */
async function calculateCharge({
  pickupPincode,
  dropPincode,
  lengthCm,
  breadthCm,
  heightCm,
  actualWeightKg,
  orderType,
  paymentType,
}) {
  if (!pickupPincode || !dropPincode) {
    throw new RateEngineError("Pickup and drop pincode are required", "MISSING_PINCODE");
  }
  if ([lengthCm, breadthCm, heightCm, actualWeightKg].some((v) => v === undefined || v === null || Number(v) <= 0)) {
    throw new RateEngineError("Dimensions and actual weight must be positive numbers", "INVALID_DIMENSIONS");
  }

  const pickupZone = await detectZone(pickupPincode);
  const dropZone = await detectZone(dropPincode);

  const zoneType = pickupZone.id === dropZone.id ? ZONE_TYPES.INTRA : ZONE_TYPES.INTER;

  const volumetricWeightKg = calcVolumetricWeight(lengthCm, breadthCm, heightCm);
  const billableWeightKg = Math.max(Number(actualWeightKg), volumetricWeightKg);

  const rateCard = await RateCard.findOne({ where: { orderType, zoneType } });
  if (!rateCard) {
    throw new RateEngineError(
      `No rate card configured for ${orderType} / ${zoneType}. Ask admin to configure it.`,
      "RATE_CARD_NOT_FOUND"
    );
  }

  const baseCharge = rateCard.baseCharge;
  const weightCharge = round2(billableWeightKg * rateCard.ratePerKg);
  const goodsCharge = round2(baseCharge + weightCharge);

  let codSurcharge = 0;
  if (paymentType === "COD") {
    const codRule = await CodSurcharge.findOne({ where: { orderType } });
    if (codRule) {
      codSurcharge =
        codRule.type === "PERCENT" ? round2((goodsCharge * codRule.value) / 100) : round2(codRule.value);
    }
  }

  const totalCharge = round2(goodsCharge + codSurcharge);

  return {
    pickupZone,
    dropZone,
    zoneType,
    volumetricWeightKg,
    billableWeightKg,
    rateCard: { id: rateCard.id, baseCharge: rateCard.baseCharge, ratePerKg: rateCard.ratePerKg },
    baseCharge,
    weightCharge,
    codSurcharge,
    totalCharge,
  };
}

module.exports = { calculateCharge, detectZone, calcVolumetricWeight, RateEngineError };
