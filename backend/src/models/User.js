const { DataTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("./sequelize");

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.UUID, defaultValue: () => uuidv4(), primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING, allowNull: false }, // bcrypt hash
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: "CUSTOMER" }, // CUSTOMER | AGENT | ADMIN
    phone: { type: DataTypes.STRING, allowNull: true },

    // Agent-only operational fields
    isAvailable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    currentLat: { type: DataTypes.FLOAT, allowNull: true },
    currentLng: { type: DataTypes.FLOAT, allowNull: true },
    homeZoneId: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: "users",
    indexes: [{ fields: ["role"] }],
  }
);

module.exports = User;
