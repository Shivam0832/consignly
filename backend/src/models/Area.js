const { DataTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("./sequelize");

// Area = one pincode mapped to exactly one Zone. This is the lookup table
// the rate engine uses for zone detection.
const Area = sequelize.define(
  "Area",
  {
    id: { type: DataTypes.UUID, defaultValue: () => uuidv4(), primaryKey: true },
    pincode: { type: DataTypes.STRING, allowNull: false, unique: true },
    zoneId: { type: DataTypes.UUID, allowNull: false },
  },
  { tableName: "areas", indexes: [{ fields: ["zoneId"] }] }
);

module.exports = Area;
