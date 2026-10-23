// Run with: npm test   (uses a throwaway SQLite file, never your dev.db)
const path = require("path");
const os = require("os");
const fs = require("fs");
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const DB_FILE = path.join(os.tmpdir(), `consignly-test-${process.pid}.db`);
process.env.DB_DIALECT = "sqlite";
process.env.SQLITE_STORAGE = DB_FILE;
process.env.JWT_SECRET = "test-secret-that-is-long-enough-123";
process.env.AUTH_RATE_LIMIT = "1000";

const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const { sequelize, Zone, Area, RateCard, CodSurcharge, User } = require("../src/models");

const api = request(app);
const tokens = {};
let north;

async function login(email) {
  const res = await api.post("/api/auth/login").send({ email, password: "password123" });
  assert.equal(res.status, 200, res.text);
  return res.body.token;
}
const as = (who) => ({ Authorization: `Bearer ${tokens[who]}` });

function newOrder(who = "customer", extra = {}) {
  return api.post("/api/orders").set(as(who)).send({
    pickupAddress: "1 Main St", pickupPincode: "110001",
    dropAddress: "2 Park Rd", dropPincode: "560001",
    lengthCm: 10, breadthCm: 10, heightCm: 10, actualWeightKg: 1,
    orderType: "B2C", paymentType: "PREPAID",
    ...(who === "admin" ? { customerEmail: "customer@test.com" } : {}),
    ...extra,
  });
}

before(async () => {
  await sequelize.sync({ force: true });
  north = await Zone.create({ name: "North" });
  const south = await Zone.create({ name: "South" });
  await Area.bulkCreate([
    { pincode: "110001", zoneId: north.id },
    { pincode: "560001", zoneId: south.id },
  ]);
  await RateCard.bulkCreate([
    { orderType: "B2C", zoneType: "INTRA", baseCharge: 30, ratePerKg: 15 },
    { orderType: "B2C", zoneType: "INTER", baseCharge: 50, ratePerKg: 25 },
  ]);
  await CodSurcharge.create({ orderType: "B2C", type: "FLAT", value: 20 });
  const password = await bcrypt.hash("password123", 10);
  await User.bulkCreate([
    { name: "Admin", email: "admin@test.com", password, role: "ADMIN" },
    { name: "Agent One", email: "agent1@test.com", password, role: "AGENT", homeZoneId: north.id },
    { name: "Agent Two", email: "agent2@test.com", password, role: "AGENT", homeZoneId: south.id },
    { name: "Customer", email: "customer@test.com", password, role: "CUSTOMER" },
    { name: "Other", email: "other@test.com", password, role: "CUSTOMER" },
  ]);
  for (const who of ["admin", "agent1", "agent2", "customer", "other"]) {
    tokens[who] = await login(`${who}@test.com`);
  }
});

after(async () => {
  await new Promise((r) => setTimeout(r, 300)); // let background notifications finish
  await sequelize.close();
  fs.rmSync(DB_FILE, { force: true });
});

test("login is case-insensitive on email", async () => {
  const res = await api.post("/api/auth/login").send({ email: "  Admin@Test.COM ", password: "password123" });
  assert.equal(res.status, 200);
});

test("bad requests return 4xx instead of crashing the server", async () => {
  const { body } = await newOrder();
  const id = body.order.id;
  assert.equal((await api.patch(`/api/orders/${id}/status`).set(as("admin")).send({})).status, 400);
  assert.equal((await api.patch(`/api/orders/${id}/status`).set(as("admin")).send({ status: "BANANA" })).status, 400);
  const bad = await api.post("/api/orders").set(as("customer")).set("Content-Type", "application/json").send("{not json");
  assert.equal(bad.status, 400);
  assert.equal((await api.get("/api/health")).status, 200, "server must still be up");
});

test("full lifecycle: place → assign → deliver, with an audit row per step", async () => {
  const { body } = await newOrder();
  const id = body.order.id;
  assert.equal(body.order.totalCharge, 50 + 25 * 1);
  const assign = await api.post(`/api/orders/${id}/auto-assign`).set(as("admin"));
  assert.equal(assign.status, 200);
  assert.equal(assign.body.order.assignedAgent.name, "Agent One");
  for (const status of ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"]) {
    const r = await api.patch(`/api/orders/${id}/status`).set(as("agent1")).send({ status });
    assert.equal(r.status, 200, r.text);
  }
  const final = await api.get(`/api/orders/${id}`).set(as("customer"));
  assert.deepEqual(
    final.body.order.trackingHistory.map((h) => h.status),
    ["PLACED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"]
  );
});

test("agents cannot cancel, skip steps, or touch other agents' orders", async () => {
  const { body } = await newOrder();
  const id = body.order.id;
  await api.post(`/api/orders/${id}/assign`).set(as("admin")).send({ agentId: (await User.findOne({ where: { email: "agent1@test.com" } })).id });
  assert.equal((await api.patch(`/api/orders/${id}/status`).set(as("agent1")).send({ status: "CANCELLED" })).status, 409);
  assert.equal((await api.patch(`/api/orders/${id}/status`).set(as("agent1")).send({ status: "DELIVERED" })).status, 409);
  assert.equal((await api.patch(`/api/orders/${id}/status`).set(as("agent2")).send({ status: "PICKED_UP" })).status, 403);
});

test("auto-assign refuses orders that are not waiting for an agent", async () => {
  const { body } = await newOrder();
  const id = body.order.id;
  await api.post(`/api/orders/${id}/cancel`).set(as("customer"));
  const r = await api.post(`/api/orders/${id}/auto-assign`).set(as("admin"));
  assert.equal(r.status, 409);
  const after = await api.get(`/api/orders/${id}`).set(as("admin"));
  assert.equal(after.body.order.status, "CANCELLED");
});

test("customers can cancel before pickup only, and only their own orders", async () => {
  const a = (await newOrder()).body.order.id;
  assert.equal((await api.post(`/api/orders/${a}/cancel`).set(as("other"))).status, 403);
  assert.equal((await api.post(`/api/orders/${a}/cancel`).set(as("customer"))).status, 200);

  const b = (await newOrder()).body.order.id;
  await api.post(`/api/orders/${b}/auto-assign`).set(as("admin"));
  await api.patch(`/api/orders/${b}/status`).set(as("agent1")).send({ status: "PICKED_UP" });
  assert.equal((await api.post(`/api/orders/${b}/cancel`).set(as("customer"))).status, 409);
});

test("reschedule validates the date and reports honestly when no agent is free", async () => {
  const id = (await newOrder()).body.order.id;
  await api.post(`/api/orders/${id}/auto-assign`).set(as("admin"));
  await api.patch(`/api/orders/${id}/status`).set(as("agent1")).send({ status: "PICKED_UP" });
  await api.patch(`/api/orders/${id}/status`).set(as("agent1")).send({ status: "FAILED", failureReason: "Nobody home" });

  assert.equal((await api.post(`/api/orders/${id}/reschedule`).set(as("customer")).send({ newDate: "tomorrow-ish" })).status, 400);
  assert.equal((await api.post(`/api/orders/${id}/reschedule`).set(as("customer")).send({ newDate: "2020-01-01" })).status, 400);

  await User.update({ isAvailable: false }, { where: { role: "AGENT" } });
  const future = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  const r = await api.post(`/api/orders/${id}/reschedule`).set(as("customer")).send({ newDate: future, autoAssign: true });
  await User.update({ isAvailable: true }, { where: { role: "AGENT" } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.body.order.status, "RESCHEDULED");
  assert.equal(r.body.assignment.assigned, false);
});

test("customers cannot auto-assign their own orders at creation", async () => {
  const r = await newOrder("customer", { autoAssign: true });
  assert.equal(r.status, 201);
  assert.equal(r.body.order.status, "PLACED");
});

test("customers only see their own orders", async () => {
  const id = (await newOrder()).body.order.id;
  assert.equal((await api.get(`/api/orders/${id}`).set(as("other"))).status, 403);
  const list = await api.get("/api/orders").set(as("other"));
  assert.equal(list.body.orders.length, 0);
});

test("deleting a zone that still has pincodes is refused, not cascaded", async () => {
  const r = await api.delete(`/api/zones/${north.id}`).set(as("admin"));
  assert.equal(r.status, 409);
  assert.equal(await Area.count({ where: { zoneId: north.id } }), 1);
});

test("rate cards reject non-numeric charges", async () => {
  const r = await api.post("/api/rate-cards").set(as("admin")).send({ orderType: "B2C", zoneType: "INTRA", baseCharge: "abc", ratePerKg: 10 });
  assert.equal(r.status, 400);
});
