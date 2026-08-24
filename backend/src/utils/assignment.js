const { User, Order } = require("../models");
const { Op } = require("sequelize");
const { ROLES } = require("./constants");

/**
 * AUTO-ASSIGNMENT LOGIC
 * ------------------------------------------------------------------------
 * Goal: pick the best available delivery agent for an order's pickup zone.
 *
 * Strategy (in priority order):
 *   1. Candidate pool = agents with role AGENT, isAvailable = true, whose
 *      homeZone matches the order's pickup zone (zone-based eligibility —
 *      an agent based in Zone A shouldn't be auto-assigned a Zone B pickup).
 *   2. If any candidates have live GPS coordinates (currentLat/currentLng),
 *      rank them by haversine distance to the pickup point (if we have
 *      pickup lat/lng) and pick the nearest.
 *   3. If no GPS data is available, fall back to "least currently-loaded"
 *      agent — the candidate with the fewest active (non-terminal) orders
 *      — so load is balanced across the zone's agent pool.
 *   4. If the pickup zone has zero available agents, widen the search to
 *      ANY available agent system-wide (better to assign late than never;
 *      admin can always manually reassign).
 *
 * Returns the chosen User row, or null if literally no agent is available.
 * ------------------------------------------------------------------------
 */

const ACTIVE_STATUSES = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"];

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function withActiveOrderCounts(agents) {
  const counts = await Promise.all(
    agents.map((a) =>
      Order.count({ where: { assignedAgentId: a.id, status: { [Op.in]: ACTIVE_STATUSES } } })
    )
  );
  return agents.map((a, i) => ({ agent: a, activeOrders: counts[i] }));
}

/**
 * @param {string} pickupZoneId
 * @param {{lat?: number, lng?: number}} pickupCoords optional GPS of pickup point
 */
async function findBestAgent(pickupZoneId, pickupCoords = {}) {
  let candidates = await User.findAll({
    where: { role: ROLES.AGENT, isAvailable: true, homeZoneId: pickupZoneId },
  });

  let widenedSearch = false;
  if (candidates.length === 0) {
    // Fallback: any available agent, any zone.
    candidates = await User.findAll({ where: { role: ROLES.AGENT, isAvailable: true } });
    widenedSearch = true;
  }

  if (candidates.length === 0) return { agent: null, widenedSearch: false };

  const withGps = candidates.filter((a) => a.currentLat != null && a.currentLng != null);

  if (withGps.length > 0 && pickupCoords.lat != null && pickupCoords.lng != null) {
    const ranked = withGps
      .map((a) => ({
        agent: a,
        distanceKm: haversineKm(pickupCoords.lat, pickupCoords.lng, a.currentLat, a.currentLng),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
    return { agent: ranked[0].agent, widenedSearch, method: "GPS_NEAREST", distanceKm: ranked[0].distanceKm };
  }

  // Fallback: least-loaded agent in the candidate pool.
  const withLoad = await withActiveOrderCounts(candidates);
  withLoad.sort((a, b) => a.activeOrders - b.activeOrders);
  return { agent: withLoad[0].agent, widenedSearch, method: "LEAST_LOADED" };
}

module.exports = { findBestAgent, haversineKm };
