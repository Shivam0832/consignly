const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");
const ctrl = require("../controllers/adminController");

router.use(authenticate);

router.post("/users", authorize(ROLES.ADMIN), ctrl.createUser);
router.get("/users", authorize(ROLES.ADMIN), ctrl.listUsers);
router.get("/stats", authorize(ROLES.ADMIN), ctrl.dashboardStats);
router.patch("/agents/:id/status", authorize(ROLES.ADMIN, ROLES.AGENT), ctrl.updateAgentStatus);

module.exports = router;
