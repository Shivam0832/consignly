const { DataTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("./sequelize");

// Append-only audit trail. Application code (see orderController.logHistory)
// only ever INSERTs rows here — never UPDATE/DELETE — so this table is a
// true immutable history of every status transition.
const TrackingHistory = sequelize.define(
  "TrackingHistory",
  {
    id: { type: DataTypes.UUID, defaultValue: () => uuidv4(), primaryKey: true },
    orderId: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false },
    note: { type: DataTypes.STRING, allowNull: true },
    actorId: { type: DataTypes.UUID, allowNull: true },
    actorRole: { type: DataTypes.STRING, allowNull: false }, // CUSTOMER | AGENT | ADMIN | SYSTEM
  },
  {
    tableName: "tracking_history",
    updatedAt: false, // never updated
    indexes: [{ fields: ["orderId"] }],
  }
);

module.exports = TrackingHistory;
