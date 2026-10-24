require("dotenv").config();
const app = require("./app");
const { sequelize } = require("./models");

const PORT = process.env.PORT || 4000;

const WEAK_SECRETS = ["", "change-this-to-a-long-random-string"];
if (WEAK_SECRETS.includes(process.env.JWT_SECRET || "") || (process.env.JWT_SECRET || "").length < 16) {
  if (process.env.NODE_ENV === "production") {
    console.error("JWT_SECRET is missing or weak. Set a long random value (e.g. `openssl rand -hex 32`) and restart.");
    process.exit(1);
  }
  console.warn("[WARN] JWT_SECRET is missing or the example value — fine for local dev, never for a deployment.");
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = require("crypto").randomBytes(32).toString("hex");
}

async function start() {
  try {
    await sequelize.authenticate();
    // NOTE: we intentionally do NOT run sync({ alter: true }) here on every
    // boot — with SQLite, "alter" rebuilds tables (create-copy-drop) and can
    // conflict with existing foreign keys/data. Schema setup is an explicit,
    // one-time step: `npm run db:sync` (see README). At boot we only ensure
    // tables exist if this is a truly fresh database (first run).
    await sequelize.sync();
    console.log(`Database ready (dialect: ${sequelize.getDialect()})`);

    app.listen(PORT, () => {
      console.log(`Last-Mile Delivery Tracker API listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
