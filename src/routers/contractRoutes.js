const express = require("express");
const router = express.Router();
const ContractController = require("../controllers/ContractController");
const { authenticate, requireAdmin } = require("../middlewares/auth");

// Yêu cầu đăng nhập đối với tất cả các API hợp đồng
router.use(authenticate);

// Lấy thống kê chung về các hợp đồng
router.get("/stats", requireAdmin, ContractController.getStats);

// Lấy danh sách toàn bộ hợp đồng (có hỗ trợ filter qua query ?status=...)
router.get("/", ContractController.getAll);

// Lấy danh sách hợp đồng đang chờ xếp phòng
router.get("/pending", requireAdmin, ContractController.getPending);

// Lấy danh sách hợp đồng sắp hết hạn
router.get("/expiring", requireAdmin, ContractController.getExpiring);

// Gửi email nhắc nhở gia hạn hợp đồng
router.post("/send-renewal-emails", requireAdmin, ContractController.sendRenewalEmails);

// Lấy danh sách hợp đồng của sinh viên
router.get("/user", ContractController.getByUser);
router.get("/user/:userId", ContractController.getByUser);

// Lấy thông tin chi tiết một hợp đồng theo ID
router.get("/:id", ContractController.getById);

// Đề xuất phòng phù hợp cho hợp đồng đang chờ xếp phòng
router.get("/:id/suggest-rooms", requireAdmin, ContractController.suggestRooms);

// Các API quản trị viên (Tự động xếp phòng, tạo mới, tạo từ đơn đăng ký, cập nhật, chuyển phòng, chấm dứt, v.v...)
router.post("/auto-assign", requireAdmin, ContractController.autoAssign);
router.post("/", requireAdmin, ContractController.create);
router.post("/from-registration", requireAdmin, ContractController.createFromRegistration);
router.put("/:id", requireAdmin, ContractController.update);
router.post("/:id/assign-room", requireAdmin, ContractController.assignRoom);
router.post("/:id/transfer-room", requireAdmin, ContractController.transferRoom);
router.post("/:id/terminate", requireAdmin, ContractController.terminate);
router.post("/:id/revert", requireAdmin, ContractController.revert);
router.post("/:id/set-volunteer-role", requireAdmin, ContractController.setVolunteerRole);
router.delete("/:id", requireAdmin, ContractController.deleteContract);

module.exports = router;
