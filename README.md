# Consignly — Last-Mile Delivery Tracker

A full-stack delivery management platform: customers place orders with an
auto-calculated charge, admins configure zones/pricing and assign agents
(manually or automatically), agents update delivery status, and customers
get notified and can track every step — with a fully immutable audit trail.

```
lastmile/
├── backend/     Node.js + Express + Sequelize API
├── frontend/    React (Vite) client — customer / agent / admin consoles
└── README.md    (this file)
```

A separate **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** covers the rate
engine, zone detection, auto-assignment, and failed-delivery handling in
more depth (≤800 words, as required by the brief).

---

## 1. Quick start (local)

Requirements: Node.js 18+, npm. No external services required — SQLite and
console-logged notifications work out of the box.

### Backend

```bash
cd backend
cp .env.example .env          # defaults work as-is for local dev
npm install
npm run db:sync               # creates all tables
npm run seed                  # seeds zones, rate cards, and demo logins
npm run dev                   # http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies /api to :4000)
```

Open `http://localhost:5173` and log in with any of the seeded accounts
(password for all: `password123`):

| Role     | Email                  | Notes                        |
|----------|-------------------------|-------------------------------|
| Admin    | admin@lastmile.com      | Full platform control         |
| Agent    | agent1@lastmile.com     | Based in North Zone           |
| Agent    | agent2@lastmile.com     | Based in South Zone           |
| Customer | customer@lastmile.com   | Can place & track orders      |

Seeded pincodes: North Zone `110001–110003`, South Zone `560001–560003`,
East Zone `700001–700003` (no agent seeded in East — useful for testing the
auto-assignment "widen search" fallback described in SYSTEM_DESIGN.md).

---

## 2. Deploying (Render / Railway / Vercel or similar)

The app is two independently-deployable services.
> ## 🔗 Live Demo & Quick Access
> **Live app:** https://consignly.vercel.app
> **Backend API:** https://consignly.onrender.com/api/health 
>
> **Demo logins** (password for all: `password123`)
> | Role | Email |
> |---|---|
> | Admin | `admin@lastmile.com` |
> | Agent | `agent1@lastmile.com` |
> | Customer | `customer@lastmile.com` |
>
> ⚠️ Backend is on Render's free tier — it sleeps after ~15 min idle. First request after that may take 30–50 seconds to wake up. This is expected, not a bug.
>
> **Suggested demo flow:** log in as customer → place an order (pickup `110001`, drop `560001`) → log in as admin → auto-assign the order → log in as the assigned agent → progress it through Picked Up → In Transit → Delivered → log back in as customer to see the tracking timeline update.

---

### Backend (Render / Railway)

1. Push this repo to GitHub.
2. Create a new **Web Service** pointing at `backend/`.
   - Build command: `npm install`
   - Start command: `npm run db:sync && npm run seed && npm start`
     (drop `&& npm run seed` after the first deploy so it doesn't reseed —
     or just run `db:sync`/`seed` once as a one-off shell command from the
     platform's console instead of baking it into the start command).
   - Add environment variables from `.env.example`. For a real deployment,
     set:
     ```
     DB_DIALECT=postgres
     DATABASE_URL=<your managed Postgres URL>
     PG_SSL=true
     JWT_SECRET=<a long random string>
     ```
     Render/Railway both offer a free/low-cost managed Postgres add-on —
     attach one and copy its connection string into `DATABASE_URL`.
   - (Optional) Add `SMTP_*` variables to send real emails — see the SMTP
     section in `.env.example` for free-tier options (Gmail app password,
     Brevo, Ethereal for testing).
3. Note the deployed URL, e.g. `https://lastmile-api.onrender.com`.

### Frontend (Vercel / Render Static Site / Railway)

1. Create a new **Static Site** / **Vite** project pointing at `frontend/`.
   - Build command: `npm install && npm run build`
   - Output directory: `dist`
   - Environment variable: `VITE_API_URL=https://lastmile-api.onrender.com`
     (the deployed backend URL from above — no trailing slash).
2. Deploy. The frontend calls `${VITE_API_URL}/api/...` directly in
   production (see `frontend/src/api/client.js`), so no proxy config is
   needed once this variable is set.

That's the whole deployment — two services, one shared env var.

---

## 3. Database schema

Modeled with Sequelize (`backend/src/models/`), portable between SQLite
(dev) and Postgres (prod) via a single `DB_DIALECT` env var — no code
changes required either way.

```
User (id, name, email, password, role, phone,
      isAvailable, currentLat, currentLng, homeZoneId)
  role: CUSTOMER | AGENT | ADMIN
  isAvailable/currentLat/currentLng/homeZoneId are agent-only fields

Zone (id, name)
Area (id, pincode [unique], zoneId)         -- pincode -> zone lookup

RateCard (id, orderType, zoneType, baseCharge, ratePerKg)
  unique (orderType, zoneType)               -- 4 rows: {B2B,B2C} x {INTRA,INTER}

CodSurcharge (id, orderType [unique], type, value)
  type: FLAT | PERCENT

Order (id, orderNumber [unique],
       customerId -> User, createdByAdminId -> User (nullable),
       pickupAddress, pickupPincode, pickupZoneId -> Zone,
       dropAddress,   dropPincode,   dropZoneId   -> Zone,
       lengthCm, breadthCm, heightCm, actualWeightKg,
       volumetricWeightKg, billableWeightKg,
       orderType, paymentType, zoneType,
       baseCharge, weightCharge, codSurcharge, totalCharge,
       status, assignedAgentId -> User (nullable),
       scheduledDate, failureReason)

TrackingHistory (id, orderId -> Order, status, note,
                  actorId -> User (nullable), actorRole, createdAt)
  -- append-only; application code never UPDATEs or DELETEs a row here

Notification (id, orderId -> Order, userId -> User,
               channel, subject, message, status, createdAt)
  channel: EMAIL | SMS
```

**Relationships:** `Order` belongs to a customer, optionally an
admin-creator, an assigned agent, and a pickup/drop `Zone` each. `Zone` has
many `Area`s (pincodes) and many agent `User`s (their home zone). `Order`
has many `TrackingHistory` rows (the immutable audit trail) and many
`Notification` rows (the delivery log for every email/SMS sent).

---

## 4. Rate calculation logic

Implemented once, in `backend/src/utils/rateEngine.js`, and used by *both*
the price-preview endpoint and order creation — so the quoted price and the
charged price can never drift apart.

1. **Zone detection** — `pickupPincode` and `dropPincode` are each looked
   up in the `Area` table to find their `Zone`. An unmapped pincode returns
   a clear `422 ZONE_NOT_FOUND` error rather than silently guessing.
2. **Volumetric weight** — `(L × B × H) ÷ 5000` (the divisor is
   `VOLUMETRIC_DIVISOR` in `.env`, so it's adjustable without a code
   change).
3. **Billable weight** — `max(actualWeightKg, volumetricWeightKg)`.
4. **Zone type** — `INTRA` if pickup zone == drop zone, else `INTER`.
5. **Rate card lookup** — the `RateCard` row for
   `(orderType, zoneType)` supplies `baseCharge` and `ratePerKg`.
   `weightCharge = billableWeight × ratePerKg`;
   `goodsCharge = baseCharge + weightCharge`.
6. **COD surcharge** — only if `paymentType === "COD"`, using the
   `CodSurcharge` row for that `orderType`: either a flat ₹ amount or a
   percentage of `goodsCharge`.
7. **Total** — `goodsCharge + codSurcharge`.

Every number above comes from the database (`RateCard`, `CodSurcharge`,
`Area`/`Zone`) — an admin can change every price on the platform from the
**Rate Cards** and **Zones** screens with zero deploys.

---

## 5. API reference

Base URL: `/api`. All endpoints except `/auth/register` and `/auth/login`
require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | public | Customer self-registration only |
| POST | `/auth/login` | public | Returns `{ token, user }` |
| GET | `/auth/me` | any | Current user |

### Zones & Areas
| Method | Path | Access |
|---|---|---|
| GET | `/zones` | any authenticated |
| POST | `/zones` `{name}` | ADMIN |
| DELETE | `/zones/:id` | ADMIN |
| POST | `/zones/areas` `{pincode, zoneId}` | ADMIN |
| DELETE | `/zones/areas/:id` | ADMIN |

### Rate cards
| Method | Path | Access |
|---|---|---|
| GET | `/rate-cards` | any authenticated |
| POST | `/rate-cards` `{orderType, zoneType, baseCharge, ratePerKg}` | ADMIN |
| POST | `/rate-cards/cod-surcharge` `{orderType, type, value}` | ADMIN |

### Orders
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/orders/calculate` | any authenticated | Price preview, no order created |
| POST | `/orders` | CUSTOMER, ADMIN | Admin may pass `customerId` or `customerEmail` |
| GET | `/orders?status=&zoneId=&agentId=&orderType=&paymentType=` | any | Role-scoped: customers see their own, agents see assigned, admin sees all + filters |
| GET | `/orders/:id` | any (owner/assignee/admin) | Full detail incl. tracking history |
| POST | `/orders/:id/assign` `{agentId}` | ADMIN | Manual assignment |
| POST | `/orders/:id/auto-assign` | ADMIN | Nearest/least-loaded available agent |
| PATCH | `/orders/:id/status` `{status, note?, failureReason?}` | ADMIN, AGENT | Agent limited to legal transitions; admin can override to any status |
| POST | `/orders/:id/reschedule` `{newDate, autoAssign?}` | CUSTOMER, ADMIN | Only valid on a `FAILED` order |

### Admin
| Method | Path | Access |
|---|---|---|
| POST | `/admin/users` `{name,email,password,role,homeZoneId?}` | ADMIN — creates AGENT/ADMIN accounts |
| GET | `/admin/users?role=` | ADMIN |
| GET | `/admin/stats` | ADMIN — dashboard counts |
| PATCH | `/admin/agents/:id/status` `{isAvailable?, currentLat?, currentLng?, homeZoneId?}` | ADMIN, AGENT (self) |

---

## 6. Order status lifecycle

```
PLACED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
                                     ↓               ↓
                                  FAILED ─────────→ FAILED
                                     ↓
                               RESCHEDULED → ASSIGNED → … (loop until delivered)

PLACED / ASSIGNED → CANCELLED (also reachable)
```

Enforced in `backend/src/utils/constants.js` (`ALLOWED_TRANSITIONS`) and
checked in `orderController.updateStatus` — an agent's `PATCH .../status`
call is rejected with `409` if it isn't a legal next step from the order's
current status. **Admins bypass this map entirely** (the explicit "override
any order status" requirement) — every transition, legal or overridden,
still writes one row to `TrackingHistory` with a timestamp and the acting
user, so the audit trail is complete either way. `TrackingHistory` rows are
only ever inserted, never updated or deleted, by any code path in the app.

---

## 7. Notifications

`backend/src/utils/notify.js` sends an email (via `nodemailer`/SMTP, any
free-tier provider — see `.env.example`) and logs an SMS line to the
console (swap `sendSms()` for a real Twilio/Fast2SMS call when ready) on
**every** status change, failed-delivery notice, and reschedule
confirmation. Both channels are logged to the `Notification` table
regardless of whether SMTP is configured, so delivery of every message —
sent, skipped, or failed — is auditable from the database even without
external services set up.

---

## 8. Design notes / trade-offs

- **Sequelize over Prisma:** built and tested with Sequelize (SQLite dev /
  Postgres prod via one env var) after confirming it end-to-end in a fully
  offline sandbox — every endpoint in this README was exercised by an
  automated smoke test covering registration, quoting, order creation,
  manual + auto assignment, the full status lifecycle, an illegal-transition
  rejection, a failed→reschedule→reassign cycle, admin override, and
  tracking-history integrity, before this was written up.
- **`sync()` instead of formal migrations:** appropriate for this project's
  scope; a growing production schema would move to `sequelize-cli`
  migrations without touching model code.
- **SMS as a logging stub:** keeps the whole flow runnable with zero paid
  services while leaving a single, obvious function (`sendSms`) to wire up
  a real provider.
