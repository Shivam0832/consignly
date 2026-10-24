const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");
const { wrapAll } = require("../utils/asyncHandler");
const ctrl = wrapAll(require("../controllers/zoneController"));

router.use(authenticate);

// Reading zones is useful for customers/agents (e.g. dropdowns) too.
router.get("/", ctrl.listZones);

// Mutations are admin-only.
router.post("/", authorize(ROLES.ADMIN), ctrl.createZone);
router.delete("/:id", authorize(ROLES.ADMIN), ctrl.deleteZone);
router.post("/areas", authorize(ROLES.ADMIN), ctrl.assignArea);
router.delete("/areas/:id", authorize(ROLES.ADMIN), ctrl.removeArea);

module.exports = router;
