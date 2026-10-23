const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const zoneRoutes = require("./routes/zone.routes");
const rateCardRoutes = require("./routes/rateCard.routes");
const orderRoutes = require("./routes/order.routes");
const adminRoutes = require("./routes/admin.routes");
const trackRoutes = require("./routes/track.routes");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1); // Render/Railway sit behind one proxy hop; needed for correct client IPs in the rate limiter
app.use(helmet());

// CORS: lock to the deployed frontend(s) when CORS_ORIGIN is set
// (comma-separated). Left unset, any origin is allowed — fine for local dev.
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : undefined));

app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "lastmile-backend" }));

// Slow down password guessing and mass sign-ups.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT || 20),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Public tracking: limit guessing of tracking numbers.
app.use(
  "/api/track",
  rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Too many lookups. Try again in a minute." } }),
  trackRoutes
);

app.use("/api/auth", authRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/rate-cards", rateCardRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Central error handler. Every route is wrapped (see utils/asyncHandler.js),
// so a thrown error or rejected promise lands here instead of crashing the
// process.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }
  if (err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError") {
    return res.status(400).json({ error: err.errors?.map((e) => e.message).join("; ") || "Invalid data" });
  }
  // Postgres rejects malformed UUIDs in WHERE clauses (e.g. GET /orders/abc).
  if (err.name === "SequelizeDatabaseError" && /invalid input syntax/i.test(err.message)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  if (err.name === "SequelizeForeignKeyConstraintError") {
    return res.status(409).json({ error: "This record is still referenced by other data" });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "Internal server error" : err.message });
});

module.exports = app;
