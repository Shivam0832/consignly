const { DataTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("./sequelize");

const Zone = sequelize.define(
  "Zone",
  {
    id: { type: DataTypes.UUID, defaultValue: () => uuidv4(), primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
  },
  { tableName: "zones" }
);

module.exports = Zone;
