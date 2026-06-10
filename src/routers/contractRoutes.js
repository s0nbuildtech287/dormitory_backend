const express = require("express");
const router = express.Router();
const ContractController = require("../controllers/ContractController");
const { authenticate, requireAdmin } = require("../middlewares/auth");

// All routes require authentication
router.use(authenticate);

// Stats
router.get("/stats", requireAdmin, ContractController.getStats);

// Get all contracts (with optional ?status=Pending|Active|...)
router.get("/", ContractController.getAll);

// Get pending contracts (waiting for room assignment)
router.get("/pending", requireAdmin, ContractController.getPending);

// Get expiring contracts
router.get("/expiring", requireAdmin, ContractController.getExpiring);

// Send renewal reminder emails
router.post("/send-renewal-emails", requireAdmin, ContractController.sendRenewalEmails);

// Get contracts by user
router.get("/user", ContractController.getByUser);
router.get("/user/:userId", ContractController.getByUser);

// Get contract by ID
router.get("/:id", ContractController.getById);

// Suggest rooms for a Pending contract
router.get("/:id/suggest-rooms", requireAdmin, ContractController.suggestRooms);

// Admin only write routes
router.post("/", requireAdmin, ContractController.create);
router.post("/from-registration", requireAdmin, ContractController.createFromRegistration);
router.put("/:id", requireAdmin, ContractController.update);
router.post("/:id/assign-room", requireAdmin, ContractController.assignRoom);
router.post("/:id/terminate", requireAdmin, ContractController.terminate);
router.post("/:id/revert", requireAdmin, ContractController.revert);
router.delete("/:id", requireAdmin, ContractController.deleteContract);

module.exports = router;
