/**
 * Seed script — populates enough data to demo the entire flow immediately.
 * Run with: npm run seed   (after `npm run db:sync`, or index.js has already
 * synced tables on boot)
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { sequelize, Zone, Area, RateCard, CodSurcharge, User } = require("../models");

async function upsertByWhere(Model, where, defaults, createOnly = {}) {
  let row = await Model.findOne({ where });
  if (row) {
    await row.update(defaults);
  } else {
    row = await Model.create({ ...where, ...defaults, ...createOnly });
  }
  return row;
}

/**
 * Demo users get the demo password only when first created. Re-running the
 * seed (e.g. on every deploy) never resets a password someone has changed.
 */
function seedUser(email, fields, pass) {
  return upsertByWhere(User, { email }, fields, { password: pass });
}

async function main() {
  // Schema is expected to already exist (via `npm run db:sync`); this is a
  // no-op safety net for a completely fresh checkout, not a migration step.
  await sequelize.sync();
  console.log("Seeding database...");

  // ---------- Zones ----------
  const north = await upsertByWhere(Zone, { name: "North Zone" }, {});
  const south = await upsertByWhere(Zone, { name: "South Zone" }, {});
  const east = await upsertByWhere(Zone, { name: "East Zone" }, {});

  // ---------- Areas (pincode -> zone) ----------
  const areaData = [
    ["110001", north.id], ["110002", north.id], ["110003", north.id],
    ["560001", south.id], ["560002", south.id], ["560003", south.id],
    ["700001", east.id], ["700002", east.id], ["700003", east.id],
  ];
  for (const [pincode, zoneId] of areaData) {
    await upsertByWhere(Area, { pincode }, { zoneId });
  }

  // ---------- Rate cards ----------
  const rateCards = [
    { orderType: "B2C", zoneType: "INTRA", baseCharge: 30, ratePerKg: 15 },
    { orderType: "B2C", zoneType: "INTER", baseCharge: 50, ratePerKg: 25 },
    { orderType: "B2B", zoneType: "INTRA", baseCharge: 40, ratePerKg: 12 },
    { orderType: "B2B", zoneType: "INTER", baseCharge: 70, ratePerKg: 20 },
  ];
  for (const rc of rateCards) {
    await upsertByWhere(RateCard, { orderType: rc.orderType, zoneType: rc.zoneType }, rc);
  }

  // ---------- COD surcharges ----------
  await upsertByWhere(CodSurcharge, { orderType: "B2C" }, { type: "FLAT", value: 20 });
  await upsertByWhere(CodSurcharge, { orderType: "B2B" }, { type: "PERCENT", value: 2 });

  // ---------- Users ----------
  const pass = await bcrypt.hash("password123", 10);

  await seedUser("admin@lastmile.com", { name: "Admin User", role: "ADMIN", phone: "9000000001" }, pass);

  await seedUser("agent1@lastmile.com", {
    name: "Ravi Kumar", role: "AGENT", phone: "9000000002",
    homeZoneId: north.id, isAvailable: true, currentLat: 28.6139, currentLng: 77.209,
  }, pass);

  await seedUser("agent2@lastmile.com", {
    name: "Suresh Babu", role: "AGENT", phone: "9000000003",
    homeZoneId: south.id, isAvailable: true, currentLat: 12.9716, currentLng: 77.5946,
  }, pass);

  await seedUser("customer@lastmile.com", { name: "Anita Sharma", role: "CUSTOMER", phone: "9000000004" }, pass);

  console.log("Seed complete.");
  console.log("-----------------------------------------");
  console.log("Login credentials (password for all: password123)");
  console.log("Admin:    admin@lastmile.com");
  console.log("Agent:    agent1@lastmile.com (North Zone)");
  console.log("Agent:    agent2@lastmile.com (South Zone)");
  console.log("Customer: customer@lastmile.com");
  console.log("Sample pincodes -> North: 110001-110003, South: 560001-560003, East: 700001-700003");
  console.log("-----------------------------------------");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
