const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const zoneRoutes = require("./routes/zone.routes");
const rateCardRoutes = require("./routes/rateCard.routes");
const orderRoutes = require("./routes/order.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true, service: "lastmile-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/rate-cards", rateCardRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Central error handler (catches anything thrown/rejected and not already handled)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

module.exports = app;
