const StudentContractDAO = require("../dao/StudentContractDAO");
const RoomDAO = require("../dao/RoomDAO");
const UserDAO = require("../dao/UserDAO");
const RegisterFormDAO = require("../dao/RegisterFormDAO");
const LogSystemDAO = require("../dao/LogSystemDAO");

class ContractService {
  /**
   * Get all contracts with filters
   */
  async getContracts(filters = {}) {
    try {
      return await StudentContractDAO.searchAndFilter(filters);
    } catch (error) {
      throw new Error(`Get contracts failed: ${error.message}`);
    }
  }

  /**
   * Get only Pending contracts (waiting for room assignment)
   */
  async getPendingContracts() {
    try {
      return await StudentContractDAO.searchAndFilter({ status: "Pending" });
    } catch (error) {
      throw new Error(`Get pending contracts failed: ${error.message}`);
    }
  }

  /**
   * Get contract by ID
   */
  async getContractById(id) {
    try {
      const contract = await StudentContractDAO.getContractDetails(id);
      if (!contract) {
        throw new Error("Contract not found");
      }
      return contract;
    } catch (error) {
      throw new Error(`Get contract failed: ${error.message}`);
    }
  }

  /**
   * Get suggested rooms for a pending contract
   * Based on gender + year-cohort matching
   */
  async suggestRooms(contractId) {
    try {
      const contract = await StudentContractDAO.findById(contractId);
      if (!contract) throw new Error("Contract not found");
      if (contract.status !== "Pending") throw new Error("Contract is not Pending");

      const gender = contract.snapshot_gender;
      const year = contract.snapshot_year;

      if (!gender) throw new Error("Contract missing gender information");

      const suggested = await StudentContractDAO.getSuggestedRooms(gender, year || 1, 5);
      return suggested;
    } catch (error) {
      throw new Error(`Suggest rooms failed: ${error.message}`);
    }
  }

  /**
   * Assign a room to a Pending contract â†’ becomes Active
   */
  async assignRoom(contractId, roomId, adminId, req = null) {
    try {
      const contract = await StudentContractDAO.findById(contractId);
      if (!contract) throw new Error("Contract not found");
      if (contract.status !== "Pending") throw new Error("Contract is not in Pending status");

      const room = await RoomDAO.findById(roomId);
      if (!room) throw new Error("Room not found");

      // Atomic assign
      await StudentContractDAO.assignRoom(contractId, roomId);

      // Update contract rent_price + generate proper number
      const contractNumber = `HD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      await StudentContractDAO.update(contractId, {
        contract_number: contractNumber,
        rent_price: room.rent_price,
        updated_at: new Date(),
      });

      // Log
      await LogSystemDAO.log(adminId, "ASSIGN_ROOM", "student_contracts", contractId, { status: "Pending", room_id: null }, { status: "Active", room_id: roomId }, req);

      return await StudentContractDAO.getContractDetails(contractId);
    } catch (error) {
      throw new Error(`Assign room failed: ${error.message}`);
    }
  }

  /**
   * Create new contract (manually, already with room)
   */
  async createContract(data, adminId, req = null) {
    try {
      const room = await RoomDAO.findById(data.room_id);
      if (!room) throw new Error("Room not found");
      if (room.current_occupancy >= room.capacity) throw new Error("Room is full");

      const user = await UserDAO.findById(data.user_id);
      if (!user) throw new Error("User not found");

      if (room.gender_type !== user.gender && user.gender) {
        throw new Error("Gender mismatch with room type");
      }

      const existingContract = await StudentContractDAO.findActiveContractByUser(data.user_id);
      if (existingContract) throw new Error("User already has an active contract");

      const contractNumber = `HD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const contractId = `contract-${Date.now()}`;

      const contractData = {
        id: contractId,
        contract_number: contractNumber,
        ...data,
        status: "Active",
        signed_at: new Date(),
        created_by: adminId,
      };

      const contract = await StudentContractDAO.createContractWithRoom(contractData);

      await LogSystemDAO.log(adminId, "CREATE_CONTRACT", "student_contracts", contractId, null, contract, req);

      return contract;
    } catch (error) {
      throw new Error(`Create contract failed: ${error.message}`);
    }
  }

  /**
   * Update contract
   */
  async updateContract(id, data, adminId, req = null) {
    try {
      const oldData = await StudentContractDAO.findById(id);
      if (!oldData) throw new Error("Contract not found");

      await StudentContractDAO.update(id, { ...data, updated_at: new Date() });

      await LogSystemDAO.log(adminId, "UPDATE_CONTRACT", "student_contracts", id, oldData, data, req);

      return await StudentContractDAO.getContractDetails(id);
    } catch (error) {
      throw new Error(`Update contract failed: ${error.message}`);
    }
  }

  /**
   * Terminate contract
   */
  async terminateContract(id, adminId, req = null) {
    try {
      const oldData = await StudentContractDAO.findById(id);
      if (!oldData) throw new Error("Contract not found");

      await StudentContractDAO.terminateContract(id);

      await LogSystemDAO.log(adminId, "TERMINATE_CONTRACT", "student_contracts", id, { status: oldData.status }, { status: "Terminated" }, req);

      return await StudentContractDAO.getContractDetails(id);
    } catch (error) {
      throw new Error(`Terminate contract failed: ${error.message}`);
    }
  }

  /**
   * Get contracts by user
   */
  async getContractsByUser(userId) {
    try {
      return await StudentContractDAO.findByUserId(userId);
    } catch (error) {
      throw new Error(`Get user contracts failed: ${error.message}`);
    }
  }

  /**
   * Get expiring contracts
   */
  async getExpiringContracts(days = 30) {
    try {
      return await StudentContractDAO.getExpiringContracts(days);
    } catch (error) {
      throw new Error(`Get expiring contracts failed: ${error.message}`);
    }
  }

  /**
   * Get contract statistics
   */
  async getStats() {
    try {
      return await StudentContractDAO.getStats();
    } catch (error) {
      throw new Error(`Get contract stats failed: ${error.message}`);
    }
  }

  /**
   * Create contract from approved registration (legacy - manual flow)
   */
  async createFromRegistration(registrationId, roomId, contractData, adminId, req = null) {
    try {
      const registration = await RegisterFormDAO.findById(registrationId);
      if (!registration) throw new Error("Registration not found");
      if (registration.status !== "Cháº¥p nháº­n") throw new Error("Registration must be approved first");

      const userId = `user-${Date.now()}`;
      const bcrypt = require("bcryptjs");
      const defaultPassword = await bcrypt.hash("123456", 10);

      await UserDAO.create({
        id: userId,
        email: registration.student_email || registration.email,
        password: defaultPassword,
        full_name: registration.student_name,
        role: "STUDENT",
        phone: registration.phone_number || registration.phone,
      });

      const contract = await this.createContract(
        {
          user_id: userId,
          room_id: roomId,
          register_form_id: registrationId,
          ...contractData,
        },
        adminId,
        req,
      );

      return { user_id: userId, contract };
    } catch (error) {
      throw new Error(`Create contract from registration failed: ${error.message}`);
    }
  }
}

module.exports = new ContractService();
