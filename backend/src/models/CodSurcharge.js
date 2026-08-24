const { DataTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("./sequelize");

const CodSurcharge = sequelize.define(
  "CodSurcharge",
  {
    id: { type: DataTypes.UUID, defaultValue: () => uuidv4(), primaryKey: true },
    orderType: { type: DataTypes.STRING, allowNull: false, unique: true }, // B2B | B2C
    type: { type: DataTypes.STRING, allowNull: false, defaultValue: "FLAT" }, // FLAT | PERCENT
    value: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "cod_surcharges" }
);

module.exports = CodSurcharge;
