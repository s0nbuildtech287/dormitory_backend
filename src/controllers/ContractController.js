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
   * Transfer room for an active contract
   */
  async transferRoom(req, res, next) {
    try {
      const { room_id } = req.body;
      if (!room_id) {
        return res.status(400).json({ success: false, message: "room_id is required" });
      }
      const contract = await ContractService.transferRoom(req.params.id, room_id, req.user.userId, req);
      res.json({ success: true, message: "Room transferred successfully", data: contract });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unassign room: đưa hợp đồng Active về Pending
   */
  async unassignRoom(req, res, next) {
    try {
      const contract = await ContractService.unassignRoom(req.params.id, req.user.userId, req);
      res.json({ success: true, message: "Đã rút phòng, hợp đồng về trạng thái chờ gán phòng", data: contract });
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

  /**
   * POST /api/contracts/auto-assign
   * Gán phòng tự động cho hợp đồng Pending
   */
  async autoAssign(req, res, next) {
    try {
      const { faculty } = req.body;
      const result = await ContractService.autoAssignPendingRooms({
        faculty,
        adminId: req.user.userId,
        req,
      });
      res.json({
        success: true,
        message: `Đã gán phòng cho ${result.assigned}/${result.processed} hợp đồng. Còn ${result.stillPending} hợp đồng chờ gán.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Yêu cầu gia hạn hợp đồng (tạo VNPay paymentUrl)
   * POST /api/contracts/:id/request-renewal
   */
  async requestRenewal(req, res, next) {
    try {
      const contractId = req.params.id;
      const userId = req.user.userId;

      const VNPayService = require("../services/VNPayService");
      const StudentContractDAO = require("../dao/StudentContractDAO");

      // 1. Kiểm tra hợp đồng tồn tại và có thuộc về sinh viên đang đăng nhập (hoặc admin)
      const contract = await StudentContractDAO.getContractDetails(contractId);
      if (!contract) {
        return res.status(404).json({ success: false, message: "Không tìm thấy hợp đồng" });
      }

      if (req.user.role === "STUDENT" && contract.user_id !== userId) {
        return res.status(403).json({ success: false, message: "Bạn không có quyền gia hạn hợp đồng này" });
      }

      // 2. Kiểm tra trạng thái và số ngày còn lại
      if (contract.status !== "Active" && contract.status !== "Expired") {
        return res.status(400).json({ success: false, message: "Chỉ có thể gia hạn hợp đồng đang hoạt động hoặc đã hết hạn" });
      }

      // Không cho phép sinh viên năm 4 gia hạn
      if (contract.snapshot_year === 4) {
        return res.status(400).json({ success: false, message: "Sinh viên năm cuối không được phép gia hạn hợp đồng" });
      }

      // Kiểm tra hạn: còn <= 35 ngày hoặc đã quá hạn trong vòng 7 ngày
      const endDate = new Date(contract.end_date);
      const timeDiff = endDate.getTime() - Date.now();
      const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

      if (daysLeft > 35) {
        return res.status(400).json({ success: false, message: `Chưa đến thời gian gia hạn (còn lại ${daysLeft} ngày, chỉ cho phép khi <= 35 ngày)` });
      }
      
      if (daysLeft < -7) {
        return res.status(400).json({ success: false, message: "Hợp đồng đã quá hạn quá 7 ngày, không thể tự gia hạn. Vui lòng liên hệ ban quản lý." });
      }

      // 3. Tính toán số tiền (tiền phòng 6 tháng)
      const monthlyPrice = Number(contract.rent_price || 500000);
      const totalAmount = monthlyPrice * 6; // Tiền phòng 6 tháng

      // 4. Tạo URL thanh toán VNPay
      const ipAddr =
        req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        req.socket?.remoteAddress ||
        "127.0.0.1";

      const txnRef = `renew_${contractId}_${Date.now()}`;
      const paymentUrl = VNPayService.createPaymentUrl({
        amount: totalAmount,
        txnRef,
        orderInfo: `Gia han hop dong KTX ${contract.contract_number || contractId} (6 thang)`,
        orderType: "billpayment",
        ipAddr,
      });

      res.json({
        success: true,
        message: "Tạo link gia hạn thành công",
        data: { paymentUrl, txnRef, amount: totalAmount }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set volunteer role for a student contract
   */
  async setVolunteerRole(req, res, next) {
    try {
      const { volunteer_role } = req.body;
      if (!volunteer_role || !["truong_xung_kich", "xung_kich"].includes(volunteer_role)) {
        return res.status(400).json({ success: false, message: "volunteer_role must be 'truong_xung_kich' or 'xung_kich'" });
      }
      const updatedContract = await ContractService.setVolunteerRole(req.params.id, volunteer_role, req.user.userId, req);
      res.json({ success: true, message: "Volunteer role updated successfully", data: updatedContract });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContractController();
