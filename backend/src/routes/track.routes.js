const router = require("express").Router();
const { wrapAll } = require("../utils/asyncHandler");
const { track } = wrapAll(require("../controllers/trackController"));

router.get("/:orderNumber", track);

module.exports = router;
