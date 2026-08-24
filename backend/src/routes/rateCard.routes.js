const router = require("express").Router();
const { authenticate, authorize } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");
const ctrl = require("../controllers/rateCardController");

router.use(authenticate);

router.get("/", ctrl.listRateCards);
router.post("/", authorize(ROLES.ADMIN), ctrl.upsertRateCard);
router.post("/cod-surcharge", authorize(ROLES.ADMIN), ctrl.upsertCodSurcharge);

module.exports = router;
