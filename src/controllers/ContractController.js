const ContractService = require("../services/ContractService");

class ContractController {
  /**
   * Get all contracts
   */
  async getAll(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        roomId: req.query.roomId,
        searchTerm: req.query.search,
      };

      const contracts = await ContractService.getContracts(filters);
      res.json({ success: true, data: contracts });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending contracts (waiting for room assignment)
   */
  async getPending(req, res, next) {
    try {
      const contracts = await ContractService.getPendingContracts();
      res.json({ success: true, data: contracts });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get contract stats
   */
  async getStats(req, res, next) {
    try {
      const stats = await ContractService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get contract by ID
   */
  async getById(req, res, next) {
    try {
      const contract = await ContractService.getContractById(req.params.id);
      res.json({ success: true, data: contract });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Suggest rooms for a pending contract
   */
  async suggestRooms(req, res, next) {
    try {
      const rooms = await ContractService.suggestRooms(req.params.id);
      res.json({ success: true, data: rooms });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign room to a pending contract → Active
   */
  async assignRoom(req, res, next) {
    try {
      const { room_id } = req.body;
      if (!room_id) {
        return res.status(400).json({ success: false, message: "room_id is required" });
      }
      const contract = await ContractService.assignRoom(req.params.id, room_id, req.user.userId, req);
      res.json({ success: true, message: "Room assigned successfully", data: contract });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new contract
   */
  async create(req, res, next) {
    try {
      const contract = await ContractService.createContract(req.body, req.user.userId, req);
      res.status(201).json({ success: true, message: "Contract created successfully", data: contract });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update contract
   */
  async update(req, res, next) {
    try {
      const contract = await ContractService.updateContract(req.params.id, req.body, req.user.userId, req);
      res.json({ success: true, message: "Contract updated successfully", data: contract });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Terminate contract
   */
  async terminate(req, res, next) {
    try {
      const contract = await ContractService.terminateContract(req.params.id, req.user.userId, req);
      res.json({ success: true, message: "Contract terminated successfully", data: contract });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get contracts by user
   */
  async getByUser(req, res, next) {
    try {
      const userId = req.params.userId || req.user.userId;
      const contracts = await ContractService.getContractsByUser(userId);
      res.json({ success: true, data: contracts });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get expiring contracts
   */
  async getExpiring(req, res, next) {
    try {
      const days = req.query.days ? parseInt(req.query.days) : 30;
      const contracts = await ContractService.getExpiringContracts(days);
      res.json({ success: true, data: contracts });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send renewal reminder emails
   * POST /api/contracts/send-renewal-emails
   * Body: { contractIds: [...] }
   */
  async sendRenewalEmails(req, res, next) {
    try {
      const { contractIds } = req.body;
      if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
        return res.status(400).json({ success: false, message: "contractIds array is required" });
      }
      const result = await ContractService.sendRenewalReminders(contractIds, req.user.userId, req);
      res.json({ 
        success: true, 
        message: `Đã gửi ${result.sent} email thành công`, 
        data: result 
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revert contract → set registration back to "Chờ duyệt", delete contract + user
   * Chỉ cho phép khi: status=Pending, chưa cọc, chưa bản cứng
   */
  async revert(req, res, next) {
    try {
      await ContractService.revertContract(req.params.id, req.user.userId, req);
      res.json({ success: true, message: "Đã hoàn tác hợp đồng, hồ sơ trở về trạng thái chờ duyệt" });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete contract
   */
  async deleteContract(req, res, next) {
    try {
      await ContractService.deleteContract(req.params.id, req.user.userId, req);
      res.json({ success: true, message: "Contract deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create contract from approved registration
   */
  async createFromRegistration(req, res, next) {
    try {
      const { registrationId, roomId, ...contractData } = req.body;
      if (!registrationId || !roomId) {
        return res.status(400).json({ success: false, message: "Registration ID and Room ID are required" });
      }
      const result = await ContractService.createFromRegistration(registrationId, roomId, contractData, req.user.userId, req);
      res.status(201).json({ success: true, message: "Contract created from registration successfully", data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContractController();
