const { Order, Zone, TrackingHistory } = require("../models");
const { HttpError } = require("../utils/asyncHandler");

/**
 * GET /api/track/:orderNumber — public parcel tracking, like a courier's
 * "track your shipment" page. Deliberately returns only status, route
 * (zones + pincodes) and timestamps: no names, addresses, phone numbers,
 * agent details or free-text notes.
 */
async function track(req, res) {
  const orderNumber = String(req.params.orderNumber || "").trim().toUpperCase();
  if (!/^LM-[A-Z0-9]+-[A-Z0-9]+$/.test(orderNumber)) {
    throw new HttpError(400, "That doesn't look like a tracking number. It starts with LM-, e.g. LM-MVKZ6L3O-RFBV.");
  }
  const order = await Order.findOne({
    where: { orderNumber },
    attributes: ["orderNumber", "status", "pickupPincode", "dropPincode", "scheduledDate", "createdAt", "updatedAt"],
    include: [
      { model: Zone, as: "pickupZone", attributes: ["name"] },
      { model: Zone, as: "dropZone", attributes: ["name"] },
      {
        model: TrackingHistory,
        as: "trackingHistory",
        attributes: ["status", "createdAt"],
        separate: true,
        order: [["createdAt", "ASC"]],
      },
    ],
  });
  if (!order) throw new HttpError(404, "No parcel found with that tracking number. Check it and try again.");
  res.json({ tracking: order });
}

module.exports = { track };
