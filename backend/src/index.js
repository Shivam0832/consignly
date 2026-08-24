require("dotenv").config();
const app = require("./app");
const { sequelize } = require("./models");

const PORT = process.env.PORT || 4000;

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
