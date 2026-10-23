const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");
const { wrapAll } = require("../utils/asyncHandler");
const ctrl = wrapAll(require("../controllers/orderController"));

router.use(authenticate);

router.post("/calculate", ctrl.calculatePreview); // any authenticated role can preview a price
router.post("/", authorize(ROLES.CUSTOMER, ROLES.ADMIN), ctrl.createOrder);
router.get("/", ctrl.listOrders); // role-scoped inside controller
router.get("/:id", ctrl.getOrder);

router.post("/:id/assign", authorize(ROLES.ADMIN), ctrl.manualAssign);
router.post("/:id/auto-assign", authorize(ROLES.ADMIN), ctrl.autoAssignEndpoint);
router.patch("/:id/status", authorize(ROLES.ADMIN, ROLES.AGENT), ctrl.updateStatus);
router.post("/:id/reschedule", authorize(ROLES.ADMIN, ROLES.CUSTOMER), ctrl.reschedule);
router.post("/:id/cancel", authorize(ROLES.ADMIN, ROLES.CUSTOMER), ctrl.cancelOrder);

module.exports = router;
