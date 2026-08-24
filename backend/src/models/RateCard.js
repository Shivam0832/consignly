const { DataTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("./sequelize");

// One row per (orderType, zoneType) combination — admin-configurable pricing.
const RateCard = sequelize.define(
  "RateCard",
  {
    id: { type: DataTypes.UUID, defaultValue: () => uuidv4(), primaryKey: true },
    orderType: { type: DataTypes.STRING, allowNull: false, unique: "rate_card_order_zone_unique" }, // B2B | B2C
    zoneType: { type: DataTypes.STRING, allowNull: false, unique: "rate_card_order_zone_unique" }, // INTRA | INTER
    baseCharge: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    ratePerKg: { type: DataTypes.FLOAT, allowNull: false },
  },
  {
    tableName: "rate_cards",
  }
);

module.exports = RateCard;
