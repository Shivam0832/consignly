# System Design — Consignly Last-Mile Delivery Tracker

## Rate Calculation Engine

The engine (`backend/src/utils/rateEngine.js`) is a single pure function,
`calculateCharge()`, called by both the price-preview endpoint and order
creation itself — so a customer never sees a quote that differs from what
they're actually charged, because there's only one code path computing
either number.

It resolves pricing in five steps, each backed entirely by database rows
rather than constants: detect the pickup and drop `Zone` from their
pincodes via the `Area` lookup table; compute volumetric weight as
`(L×B×H)/5000`; take the billable weight as `max(actual, volumetric)`;
classify the shipment as `INTRA` (same zone) or `INTER` (different zones)
and fetch the matching `RateCard` row for the given `orderType` — this is
where B2B and B2C diverge, since each has its own base charge and
per-kg rate for both zone types (four rows total: B2B/B2C × INTRA/INTER);
and finally, if `paymentType` is `COD`, apply that order type's
`CodSurcharge` rule (flat ₹ or a percentage of the goods charge). An
admin can change any of these numbers from the Rate Cards screen with zero
deploys — the engine has no hardcoded prices, only a hardcoded *shape*
(which fields combine how). An unmapped pincode fails loudly with a
`422 ZONE_NOT_FOUND` rather than defaulting to a guessed zone, since a wrong
zone silently produces a wrong price.

## Zone Detection Approach

Zone detection is deliberately a flat, admin-owned lookup table rather than
a geocoding or radius calculation: `Area.pincode` (unique) points at
exactly one `Zone.id`. This keeps the mapping fully transparent and
editable by non-technical ops staff — admins add or move a pincode from the
Zones screen and it takes effect on the very next quote, with no
re-indexing or external API dependency. The trade-off is that pincodes not
yet mapped can't be quoted; this is intentional, since a delivery zone
without a defined rate card genuinely has no correct price to quote, and
failing explicitly is safer than approximating one. This same `Area` table
doubles as the input to auto-assignment (an agent's `homeZoneId` is drawn
from the same zone space as `Order.pickupZoneId`), so zone semantics stay
consistent across pricing and dispatch rather than being two parallel
concepts that could drift apart.

## Auto-Assignment Logic

`backend/src/utils/assignment.js` picks an agent in three descending tiers,
implemented in `findBestAgent()`:

1. **Zone-eligible candidates** — agents with `role=AGENT`,
   `isAvailable=true`, and `homeZoneId` matching the order's pickup zone.
   Restricting to the pickup zone first avoids assigning a driver who has
   no practical reason to be near the pickup point.
2. **GPS nearest-neighbor** — if any zone-eligible candidates have a live
   `currentLat`/`currentLng`, they're ranked by haversine distance and the
   closest wins. This is the "true" nearest-agent path when live location
   data exists.
3. **Least-loaded fallback** — if no candidate has GPS data (or none is
   supplied for the pickup point), agents are instead ranked by their count
   of currently-active orders (`ASSIGNED`/`PICKED_UP`/`IN_TRANSIT`/
   `OUT_FOR_DELIVERY`), and the least-busy agent is chosen. This keeps
   workload roughly balanced across a zone's agent pool even without
   real-time tracking.
4. **Zone-widening safety net** — if the pickup zone has zero available
   agents at all, the search widens to *any* available agent system-wide
   rather than leaving the order permanently unassignable; this is logged
   in the tracking note (`"widened beyond home zone"`) so admins can spot
   understaffed zones and reassign or hire accordingly.

Both manual assignment (admin picks an agent explicitly) and
auto-assignment funnel through the same status transition and notification
code, so the two paths stay behaviorally identical from the customer's
point of view — only the "how the agent was chosen" note in the tracking
history differs.

## Failed Delivery Handling

A `FAILED` status is a first-class, re-enterable state rather than a dead
end. When an agent marks a delivery `FAILED` (with a required reason), the
customer is notified immediately via the same `orderStatusChanged()` path
used for every other transition, and the order becomes eligible for
`POST /orders/:id/reschedule`. That endpoint validates the order is
currently `FAILED`, requires a `newDate`, transitions the order to
`RESCHEDULED`, and — critically — **clears `assignedAgentId`**, since the
agent who failed the first attempt shouldn't be silently re-assigned by
default. If the caller passes `autoAssign: true` (the customer-facing UI
always does), `runAutoAssign()` immediately runs again, so a fresh
`ASSIGNED` order with a newly-chosen agent appears in one API round trip.
Every one of these transitions — `FAILED`, `RESCHEDULED`, and the
follow-up `ASSIGNED` — writes its own immutable `TrackingHistory` row, so
a failed-then-recovered delivery has a complete, timestamped record of
exactly what happened and who acted at each step, visible to the customer
in the same tracking timeline as a delivery that succeeded on the first
attempt.
