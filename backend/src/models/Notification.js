const { DataTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("./sequelize");

const Notification = sequelize.define(
  "Notification",
  {
    id: { type: DataTypes.UUID, defaultValue: () => uuidv4(), primaryKey: true },
    orderId: { type: DataTypes.UUID, allowNull: true },
    userId: { type: DataTypes.UUID, allowNull: true },
    channel: { type: DataTypes.STRING, allowNull: false }, // EMAIL | SMS
    subject: { type: DataTypes.STRING, allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "SENT" }, // SENT | FAILED | SKIPPED
  },
  {
    tableName: "notifications",
    updatedAt: false,
    indexes: [{ fields: ["orderId"] }],
  }
);

module.exports = Notification;
