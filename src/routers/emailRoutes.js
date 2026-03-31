const express = require("express");
const router = express.Router();
const EmailController = require("../controllers/EmailController");
const { authenticate, requireAdmin } = require("../middlewares/auth");

router.use(authenticate);
router.post("/send", requireAdmin, EmailController.send);

module.exports = router;
