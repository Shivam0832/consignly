const sequelize = require("./sequelize");
const User = require("./User");
const Zone = require("./Zone");
const Area = require("./Area");
const RateCard = require("./RateCard");
const CodSurcharge = require("./CodSurcharge");
const Order = require("./Order");
const TrackingHistory = require("./TrackingHistory");
const Notification = require("./Notification");

// ---------------------------------------------------------------------------
// Associations — mirrors the relational design described in the schema
// section of the README / system design doc.
// ---------------------------------------------------------------------------

// Zone <-> Area (1 zone : many pincodes)
Zone.hasMany(Area, { foreignKey: "zoneId", as: "areas" });
Area.belongsTo(Zone, { foreignKey: "zoneId", as: "zone" });

// Zone <-> User (an agent's home zone)
Zone.hasMany(User, { foreignKey: "homeZoneId", as: "agents" });
User.belongsTo(Zone, { foreignKey: "homeZoneId", as: "homeZone" });

// User <-> Order (customer)
User.hasMany(Order, { foreignKey: "customerId", as: "ordersAsCustomer" });
Order.belongsTo(User, { foreignKey: "customerId", as: "customer" });

// User <-> Order (admin who created it on behalf of customer)
User.hasMany(Order, { foreignKey: "createdByAdminId", as: "ordersCreatedByMe" });
Order.belongsTo(User, { foreignKey: "createdByAdminId", as: "createdByAdmin" });

// User <-> Order (assigned delivery agent)
User.hasMany(Order, { foreignKey: "assignedAgentId", as: "ordersAsAgent" });
Order.belongsTo(User, { foreignKey: "assignedAgentId", as: "assignedAgent" });

// Zone <-> Order (pickup / drop)
Zone.hasMany(Order, { foreignKey: "pickupZoneId", as: "pickupOrders" });
Order.belongsTo(Zone, { foreignKey: "pickupZoneId", as: "pickupZone" });

Zone.hasMany(Order, { foreignKey: "dropZoneId", as: "dropOrders" });
Order.belongsTo(Zone, { foreignKey: "dropZoneId", as: "dropZone" });

// Order <-> TrackingHistory (1 : many, immutable)
Order.hasMany(TrackingHistory, { foreignKey: "orderId", as: "trackingHistory" });
TrackingHistory.belongsTo(Order, { foreignKey: "orderId", as: "order" });
User.hasMany(TrackingHistory, { foreignKey: "actorId", as: "trackingEvents" });
TrackingHistory.belongsTo(User, { foreignKey: "actorId", as: "actor" });

// Order <-> Notification
Order.hasMany(Notification, { foreignKey: "orderId", as: "notifications" });
Notification.belongsTo(Order, { foreignKey: "orderId", as: "order" });
User.hasMany(Notification, { foreignKey: "userId", as: "notifications" });
Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

module.exports = {
  sequelize,
  User,
  Zone,
  Area,
  RateCard,
  CodSurcharge,
  Order,
  TrackingHistory,
  Notification,
};
