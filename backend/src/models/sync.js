/**
 * Creates/updates all tables to match the model definitions.
 * For SQLite (dev) this is safe to run repeatedly. For a real production
 * Postgres deployment, prefer proper migrations (e.g. sequelize-cli) once
 * the schema stabilizes — `sync({ alter: true })` is intentionally used
 * here to keep local/grading setup to a single command, per the README.
 */
require("dotenv").config();
const { sequelize } = require("./index");

async function main() {
  await sequelize.authenticate();
  console.log(`Connected to DB (dialect: ${sequelize.getDialect()})`);
  await sequelize.sync({ alter: true });
  console.log("All tables synced.");
  process.exit(0);
}

main().catch((err) => {
  console.error("DB sync failed:", err);
  process.exit(1);
});
