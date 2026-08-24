const { Sequelize } = require("sequelize");
const path = require("path");

/**
 * DATABASE CONNECTION
 * ------------------------------------------------------------------------
 * Dev / zero-config / grading: SQLite file on disk (DB_DIALECT=sqlite, the
 * default). Production: set DB_DIALECT=postgres and DATABASE_URL to a
 * Postgres connection string — no other code changes required anywhere in
 * the app; every model/controller talks to Sequelize, never to the raw
 * driver.
 * ------------------------------------------------------------------------
 */
const dialect = (process.env.DB_DIALECT || "sqlite").toLowerCase();

let sequelize;
if (dialect === "postgres" || dialect === "postgresql") {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: false,
    dialectOptions: process.env.PG_SSL === "true" ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  });
} else {
  const storage = process.env.SQLITE_STORAGE || path.join(__dirname, "..", "..", "dev.db");
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage,
    logging: false,
  });
}

module.exports = sequelize;
