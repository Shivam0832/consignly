const { DataTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("./sequelize");

const Order = sequelize.define(
  "Order",
  {
    id: { type: DataTypes.UUID, defaultValue: () => uuidv4(), primaryKey: true },
    orderNumber: { type: DataTypes.STRING, allowNull: false, unique: true },

    customerId: { type: DataTypes.UUID, allowNull: false },
    createdByAdminId: { type: DataTypes.UUID, allowNull: true },

    pickupAddress: { type: DataTypes.TEXT, allowNull: false },
    pickupPincode: { type: DataTypes.STRING, allowNull: false },
    pickupZoneId: { type: DataTypes.UUID, allowNull: true },

    dropAddress: { type: DataTypes.TEXT, allowNull: false },
    dropPincode: { type: DataTypes.STRING, allowNull: false },
    dropZoneId: { type: DataTypes.UUID, allowNull: true },

    lengthCm: { type: DataTypes.FLOAT, allowNull: false },
    breadthCm: { type: DataTypes.FLOAT, allowNull: false },
    heightCm: { type: DataTypes.FLOAT, allowNull: false },
    actualWeightKg: { type: DataTypes.FLOAT, allowNull: false },
    volumetricWeightKg: { type: DataTypes.FLOAT, allowNull: false },
    billableWeightKg: { type: DataTypes.FLOAT, allowNull: false },

    orderType: { type: DataTypes.STRING, allowNull: false }, // B2B | B2C
    paymentType: { type: DataTypes.STRING, allowNull: false }, // PREPAID | COD
    zoneType: { type: DataTypes.STRING, allowNull: false }, // INTRA | INTER

    baseCharge: { type: DataTypes.FLOAT, allowNull: false },
    weightCharge: { type: DataTypes.FLOAT, allowNull: false },
    codSurcharge: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    totalCharge: { type: DataTypes.FLOAT, allowNull: false },

    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "PLACED" },
    assignedAgentId: { type: DataTypes.UUID, allowNull: true },

    scheduledDate: { type: DataTypes.DATE, allowNull: true },
    failureReason: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "orders",
    indexes: [
      { fields: ["status"] },
      { fields: ["customerId"] },
      { fields: ["assignedAgentId"] },
      { fields: ["pickupZoneId"] },
      { fields: ["dropZoneId"] },
    ],
  }
);

module.exports = Order;
