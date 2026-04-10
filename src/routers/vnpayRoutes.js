const express    = require("express");
const router     = express.Router();
const VNPayController = require("../controllers/VNPayController");
const { authenticate } = require("../middlewares/auth");

// Tạo URL thanh toán (yêu cầu đăng nhập)
router.post("/create-payment", authenticate, VNPayController.createPayment);

// IPN — VNPay gọi server-to-server (không cần auth)
router.get("/ipn", VNPayController.ipn);

// Return URL — VNPay redirect browser về (không cần auth)
router.get("/return", VNPayController.returnUrl);

module.exports = router;
