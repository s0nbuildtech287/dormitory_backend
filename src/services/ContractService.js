const StudentContractDAO = require("../dao/StudentContractDAO");
const RoomDAO = require("../dao/RoomDAO");
const UserDAO = require("../dao/UserDAO");
const RegisterFormDAO = require("../dao/RegisterFormDAO");
const LogSystemDAO = require("../dao/LogSystemDAO");

function checkIsInternational(priorityReasons) {
  if (!priorityReasons) return false;
  const normalized = priorityReasons
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return ["luu hoc sinh", "quoc te", "nuoc ngoai", "du hoc sinh", "du hoc", "lao", "campuchia"].some(kw => normalized.includes(kw));
}

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
   * Returns { suggested: [...5 top rooms], all: [...all valid rooms] }
   * Based on gender + year-cohort + faculty matching
   */
  async suggestRooms(contractId) {
    try {
      const contractDetails = await StudentContractDAO.getContractDetails(contractId);
      if (!contractDetails) throw new Error("Contract not found");

      const gender = contractDetails.snapshot_gender;
      const year = contractDetails.snapshot_year;
      const faculty = contractDetails.snapshot_faculty;

      if (!gender) throw new Error("Contract missing gender information");

      // Lấy toàn bộ phòng hợp lệ, không giới hạn
      const suggested = await StudentContractDAO.getSuggestedRooms(gender, year || 1, faculty);

      const isStudentInternational = checkIsInternational(contractDetails.rf_priority_reasons);

      // Xác định studentCategory giống Auto Assign
      let studentCategory = "general";
      if (isStudentInternational) {
        studentCategory = "international";
      } else if ((year || 1) === 1) {
        studentCategory = "freshmen";
      } else {
        studentCategory = "returning_students";
      }

      // Lấy danh sách các hợp đồng active kèm priority_reasons
      const activeContracts = await StudentContractDAO.searchAndFilter({ status: "Active" });
      const roomOccupantsMap = {};
      for (const c of activeContracts) {
        if (c.room_id) {
          if (!roomOccupantsMap[c.room_id]) {
            roomOccupantsMap[c.room_id] = [];
          }
          roomOccupantsMap[c.room_id].push(c.rf_priority_reasons || "");
        }
      }

      // Lọc: reserved_for + quốc tịch (nhất quán với Auto Assign)
      const filtered = suggested.filter(room => {
        // Lọc reserved_for: phải khớp đúng loại hoặc là general (chỉ cho SV Việt Nam)
        if (room.reserved_for === "xung_kich") return false;
        if (room.reserved_for === "international" && studentCategory !== "international") return false;
        if (studentCategory === "international" && room.reserved_for !== "international") return false;
        if (room.reserved_for && room.reserved_for !== "general" && room.reserved_for !== studentCategory) return false;

        // Lọc quốc tịch
        const occupantsReasons = roomOccupantsMap[room.id] || [];
        if (occupantsReasons.length === 0) return true;

        const hasInternationalOccupant = occupantsReasons.some(r => checkIsInternational(r));
        if (isStudentInternational) {
          return hasInternationalOccupant;
        } else {
          return !hasInternationalOccupant;
        }
      });

      // Top 5 gợi ý + toàn bộ danh sách hợp lệ
      return {
        suggested: filtered.slice(0, 5),
        all: filtered
      };
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
        volunteer_role: room.reserved_for === "xung_kich" ? "xung_kich" : null
      });

      // Log
      await LogSystemDAO.log(adminId, "ASSIGN_ROOM", "student_contracts", contractId, { status: "Pending", room_id: null }, { status: "Active", room_id: roomId }, req);

      return await StudentContractDAO.getContractDetails(contractId);
    } catch (error) {
      throw new Error(`Assign room failed: ${error.message}`);
    }
  }

  /**
   * Transfer room for an active contract
   */
  async transferRoom(contractId, newRoomId, adminId, req = null) {
    try {
      const contract = await StudentContractDAO.findById(contractId);
      if (!contract) throw new Error("Contract not found");
      if (contract.status !== "Active") throw new Error("Contract is not Active");

      const oldRoomId = contract.room_id;
      if (oldRoomId === newRoomId) throw new Error("Student is already in this room");

      const newRoom = await RoomDAO.findById(newRoomId);
      if (!newRoom) throw new Error("Target room not found");
      if (newRoom.current_occupancy >= newRoom.capacity) throw new Error("Target room is full");

      if (newRoom.reserved_for === "xung_kich") {
        const contractDetails = await StudentContractDAO.getContractDetails(contractId);
        if (contractDetails && contractDetails.rf_priority_reasons) {
          const normalized = contractDetails.rf_priority_reasons
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
          const isInternational = ["luu hoc sinh", "quoc te", "nuoc ngoai", "du hoc sinh", "du hoc", "lao", "campuchia"].some(kw => normalized.includes(kw));
          if (isInternational) {
            throw new Error("Không thể chuyển sinh viên quốc tế vào phòng xung kích");
          }
        }
      }

      // Transactional transfer
      await StudentContractDAO.transferRoom(contractId, oldRoomId, newRoomId);

      // Manage volunteer role change
      const oldRoom = await RoomDAO.findById(oldRoomId);
      let newRole = contract.volunteer_role;
      if (newRoom.reserved_for === "xung_kich") {
        if (oldRoom.building !== newRoom.building || !newRole) {
          newRole = "xung_kich";
        }
      } else {
        newRole = null;
      }
      if (newRole !== contract.volunteer_role) {
        await StudentContractDAO.update(contractId, { volunteer_role: newRole, updated_at: new Date() });
      }

      // Log
      await LogSystemDAO.log(adminId, "TRANSFER_ROOM", "student_contracts", contractId, { room_id: oldRoomId }, { room_id: newRoomId }, req);

      return await StudentContractDAO.getContractDetails(contractId);
    } catch (error) {
      throw new Error(`Transfer room failed: ${error.message}`);
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
        volunteer_role: room.reserved_for === "xung_kich" ? "xung_kich" : null
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

      if (data.volunteer_role !== undefined && data.volunteer_role !== oldData.volunteer_role) {
        throw new Error("Không thể thay đổi chức vụ xung kích trực tiếp qua cập nhật hợp đồng. Vui lòng sử dụng tính năng phân quyền xung kích.");
      }

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
   * Unassign room: đưa hợp đồng Active về Pending, giải phóng chỗ phòng cũ
   */
  async unassignRoom(id, adminId, req = null) {
    try {
      const contract = await StudentContractDAO.findById(id);
      if (!contract) throw new Error("Contract not found");
      if (contract.status !== "Active") throw new Error("Chỉ có thể rút phòng khi hợp đồng đang Active");
      if (!contract.room_id) throw new Error("Hợp đồng chưa được gán phòng");

      const oldRoomId = contract.room_id;

      await StudentContractDAO.unassignRoom(id);

      await LogSystemDAO.log(adminId, "UNASSIGN_ROOM", "student_contracts", id,
        { status: "Active", room_id: oldRoomId },
        { status: "Pending", room_id: null },
        req
      );

      return await StudentContractDAO.getContractDetails(id);
    } catch (error) {
      throw new Error(`Unassign room failed: ${error.message}`);
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
   * Send renewal reminder emails to students with expiring contracts
   * @param {Array<string>} contractIds - Array of contract IDs
   * @param {string} adminId - Admin ID sending emails
   * @param {object} req - Request object
   * @returns {object} { sent, failed }
   */
  async sendRenewalReminders(contractIds, adminId, req = null) {
    try {
      const EmailService = require("./EmailService");
      const sent = [];
      const failed = [];

      for (const contractId of contractIds) {
        try {
          const contract = await StudentContractDAO.getContractDetails(contractId);
          if (!contract || !contract.student_email) {
            failed.push({ contractId, reason: "Contract or email not found" });
            continue;
          }

          const daysUntilExpiry = Math.ceil((new Date(contract.end_date) - new Date()) / (1000 * 60 * 60 * 24));
          const endDateFormatted = new Date(contract.end_date).toLocaleDateString("vi-VN");
          const studentName = contract.student_name || "Sinh viên";
          const isYear4 = contract.snapshot_year === 4;

          const subject = isYear4
            ? "Thông báo kết thúc hợp đồng ký túc xá"
            : "Thông báo gia hạn hợp đồng ký túc xá";

          const text = isYear4
            ? `Kính gửi ${studentName},\n\nHợp đồng ký túc xá của bạn (${contract.contract_number}) sẽ hết hạn vào ngày ${endDateFormatted} (còn ${daysUntilExpiry} ngày).\n\nDo bạn đang học năm cuối, hợp đồng sẽ không được gia hạn sau khi hết hạn. Vui lòng sắp xếp chỗ ở mới và hoàn tất thủ tục trả phòng trước ngày hết hạn.\n\nChúc bạn tốt nghiệp thuận lợi!\n\nTrân trọng,\nBan quản lý KTX`
            : `Kính gửi ${studentName},\n\nHợp đồng ký túc xá của bạn (${contract.contract_number}) sẽ hết hạn vào ngày ${endDateFormatted} (còn ${daysUntilExpiry} ngày).\n\nVui lòng liên hệ Ban quản lý để gia hạn hợp đồng nếu bạn muốn tiếp tục ở lại.\n\nTrân trọng,\nBan quản lý KTX`;

          const html = isYear4
            ? `<p>Kính gửi <strong>${studentName}</strong>,</p><p>Hợp đồng ký túc xá của bạn (<strong>${contract.contract_number}</strong>) sẽ hết hạn vào ngày <strong>${endDateFormatted}</strong> (còn <strong>${daysUntilExpiry} ngày</strong>).</p><p>Do bạn đang học <strong>năm cuối</strong>, hợp đồng sẽ <strong style="color:red">không được gia hạn</strong> sau khi hết hạn. Vui lòng sắp xếp chỗ ở mới và hoàn tất thủ tục trả phòng trước ngày hết hạn.</p><p>Chúc bạn tốt nghiệp thuận lợi!</p><p>Trân trọng,<br/>Ban quản lý KTX</p>`
            : `<p>Kính gửi <strong>${studentName}</strong>,</p><p>Hợp đồng ký túc xá của bạn (<strong>${contract.contract_number}</strong>) sẽ hết hạn vào ngày <strong>${endDateFormatted}</strong> (còn <strong>${daysUntilExpiry} ngày</strong>).</p><p>Vui lòng liên hệ Ban quản lý để <strong>gia hạn hợp đồng</strong> nếu bạn muốn tiếp tục ở lại.</p><p>Trân trọng,<br/>Ban quản lý KTX</p>`;

          await EmailService.sendEmail({
            to: contract.student_email,
            subject,
            text,
            html,
          });

          sent.push(contractId);
        } catch (error) {
          console.error(`Failed to send renewal email for contract ${contractId}:`, error.message);
          failed.push({ contractId, reason: error.message });
        }
      }

      // Log action
      if (adminId && req) {
        await LogSystemDAO.log(adminId, "SEND_RENEWAL_REMINDERS", "student_contracts", null, null, { sent: sent.length, failed: failed.length, contractIds }, req);
      }

      return { sent: sent.length, failed: failed.length, details: { sent, failed } };
    } catch (error) {
      throw new Error(`Send renewal reminders failed: ${error.message}`);
    }
  }

  /**
   * Revert contract: xóa contract, set registration về "Chờ duyệt", xóa user account
   * Chỉ cho phép khi Pending + chưa cọc + chưa bản cứng
   */
  async revertContract(id, adminId, req = null) {
    try {
      const contract = await StudentContractDAO.findById(id);
      if (!contract) throw new Error("Không tìm thấy hợp đồng");
      if (contract.status !== "Pending") throw new Error("Chỉ có thể hoàn tác hợp đồng ở trạng thái Chờ gán phòng");
      if (contract.deposit_paid) throw new Error("Không thể hoàn tác: sinh viên đã nộp tiền cọc");
      if (contract.hard_copy_received) throw new Error("Không thể hoàn tác: đã nhận bản cứng hợp đồng");

      // Set registration về "Chờ duyệt" nếu có liên kết
      if (contract.register_form_id) {
        await RegisterFormDAO.update(contract.register_form_id, {
          status: "Chờ duyệt",
          reviewed_by: null,
          reviewed_at: null,
          note: null,
        });
      }

      // Xóa contract
      await StudentContractDAO.delete(id);

      // Xóa user account đi kèm
      if (contract.user_id) {
        await UserDAO.delete(contract.user_id);
      }

      await LogSystemDAO.log(adminId, "REVERT_CONTRACT", "student_contracts", id, contract, null, req);

      return { reverted: true };
    } catch (error) {
      throw new Error(`Revert contract failed: ${error.message}`);
    }
  }

  /**
   * Delete contract
   */
  async deleteContract(id, adminId, req = null) {
    try {
      const contract = await StudentContractDAO.findById(id);
      if (!contract) throw new Error("Contract not found");

      if (contract.status === "Terminated") {
        // Nếu đã ở trạng thái Chấm dứt, thực hiện xóa cứng khỏi DB và xóa tài khoản user liên quan
        await StudentContractDAO.delete(id);
        if (contract.user_id) {
          const user = await UserDAO.findById(contract.user_id);
          if (user) {
            await UserDAO.delete(contract.user_id);
            await LogSystemDAO.log(adminId, "DELETE_USER", "users", contract.user_id, user, null, req);
          }
        }
        await LogSystemDAO.log(adminId, "DELETE_CONTRACT_HARD", "student_contracts", id, contract, null, req);
      } else {
        // Nếu chưa Chấm dứt, thực hiện xóa mềm (chấm dứt và giải phóng phòng)
        await StudentContractDAO.terminateContract(id);
        await LogSystemDAO.log(adminId, "DELETE_CONTRACT_SOFT", "student_contracts", id, contract, { status: "Terminated" }, req);
      }

      return { deleted: true };
    } catch (error) {
      throw new Error(`Delete contract failed: ${error.message}`);
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
      const rawPassword = registration.cccd || "123456";
      const defaultPassword = await bcrypt.hash(rawPassword, 10);

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

  /**
   * Set volunteer role for a student contract
   * If promoting to leader ('truong_xung_kich'), the previous leader of the same building is demoted to 'xung_kich'
   */
  async setVolunteerRole(contractId, volunteerRole, adminId, req = null) {
    try {
      const contract = await StudentContractDAO.findById(contractId);
      if (!contract) throw new Error("Contract not found");

      if (contract.status !== "Active") {
        throw new Error("Chỉ có thể cập nhật chức vụ xung kích cho hợp đồng đang hoạt động (Active)");
      }

      const room = await RoomDAO.findById(contract.room_id);
      if (!room || room.reserved_for !== "xung_kich") {
        throw new Error("Contract does not belong to a volunteer room");
      }

      const oldRole = contract.volunteer_role;

      // If promoting to leader, we need to demote the old leader of the building
      if (volunteerRole === "truong_xung_kich") {
        const building = room.building;
        // Find existing active leader contract in the same building
        const query = `
          SELECT sc.id, sc.volunteer_role
          FROM student_contracts sc
          JOIN rooms r ON sc.room_id = r.id
          WHERE r.building = $1 
            AND sc.volunteer_role = 'truong_xung_kich'
            AND sc.status = 'Active'
        `;
        const existingLeaders = await StudentContractDAO.executeQuery(query, [building]);

        for (const leader of existingLeaders) {
          if (leader.id !== contractId) {
            await StudentContractDAO.update(leader.id, {
              volunteer_role: "xung_kich",
              updated_at: new Date()
            });

            // Log demotion
            await LogSystemDAO.log(
              adminId,
              "UPDATE_VOLUNTEER_ROLE",
              "student_contracts",
              leader.id,
              { volunteer_role: "truong_xung_kich" },
              { volunteer_role: "xung_kich" },
              req
            );
          }
        }
      }

      // Update target contract
      await StudentContractDAO.update(contractId, {
        volunteer_role: volunteerRole,
        updated_at: new Date()
      });

      // Log promotion/role update
      await LogSystemDAO.log(
        adminId,
        "UPDATE_VOLUNTEER_ROLE",
        "student_contracts",
        contractId,
        { volunteer_role: oldRole },
        { volunteer_role: volunteerRole },
        req
      );

      return await StudentContractDAO.getContractDetails(contractId);
    } catch (error) {
      throw new Error(`Set volunteer role failed: ${error.message}`);
    }
  }

  /**
   * Gán phòng tự động cho các hợp đồng Pending (sau khi đã duyệt hồ sơ).
   * Ưu tiên xếp cùng khoa và cùng năm học (khóa học).
   */
  async autoAssignPendingRooms({ faculty, adminId, req = null }) {
    try {
      const RegistrationService = require("./RegistrationService");
      const rooms = (await RoomDAO.findAll({ status: "Active" })).map((r) => ({ ...r }));

      let contracts = await StudentContractDAO.searchAndFilter({ status: "Pending" });
      if (faculty && faculty !== "All") {
        contracts = contracts.filter((c) => c.snapshot_faculty === faculty);
      }

      contracts.sort((a, b) => {
        const aBasket = RegistrationService.determineBasket(a.rf_priority_reasons, a.snapshot_year);
        const bBasket = RegistrationService.determineBasket(b.rf_priority_reasons, b.snapshot_year);
        if (aBasket !== bBasket) return aBasket - bBasket;
        return (b.rf_ai_score || 0) - (a.rf_ai_score || 0);
      });

      // Nạp danh sách các hợp đồng Active để làm bản đồ phân bổ sinh viên hiện tại trong bộ nhớ (Tránh N+1 query)
      const activeContracts = await StudentContractDAO.searchAndFilter({ status: "Active" });
      const roomOccupantsMap = {};
      for (const c of activeContracts) {
        if (c.room_id) {
          if (!roomOccupantsMap[c.room_id]) {
            roomOccupantsMap[c.room_id] = [];
          }
          const reasons = (c.rf_priority_reasons || "").toLowerCase();
          const isOccupantInternational = reasons.includes("lưu học sinh") ||
                                          reasons.includes("quốc tế") ||
                                          reasons.includes("du học sinh");
          roomOccupantsMap[c.room_id].push({
            year: c.snapshot_year,
            faculty: c.snapshot_faculty,
            isInternational: isOccupantInternational
          });
        }
      }

      const allocations = [];
      let processed = 0;
      let assigned = 0;
      let stillPending = 0;

      for (const contract of contracts) {
        processed++;
        const priorityReasons = contract.rf_priority_reasons || "";
        const year = contract.snapshot_year;
        const gender = contract.snapshot_gender;
        const studentFaculty = contract.snapshot_faculty;

        let studentCategory = "general";
        const lowerReason = priorityReasons.toLowerCase();
        if (
          lowerReason.includes("lưu học sinh") ||
          lowerReason.includes("quốc tế") ||
          lowerReason.includes("du học sinh")
        ) {
          studentCategory = "international";
        } else if (year === 1) {
          studentCategory = "freshmen";
        } else {
          studentCategory = "returning_students";
        }

        let bestRoom = null;
        let bestScore = -1;

        for (const room of rooms) {
          if (gender && room.gender_type !== gender) continue;
          if (room.current_occupancy >= room.capacity) continue;
          if (room.reserved_for === "xung_kich") continue;

          let baseScore = 0;
          if (room.reserved_for === studentCategory) baseScore = 10;
          else if ((room.reserved_for === "general" || !room.reserved_for) && studentCategory !== "international") baseScore = 5;
          else continue;

          // Ràng buộc cứng diện quốc tịch (quốc tế vs Việt Nam)
          const occupants = roomOccupantsMap[room.id] || [];
          if (occupants.length > 0) {
            const hasInternational = occupants.some(o => o.isInternational);
            if (studentCategory === "international" && !hasInternational) continue;
            if (studentCategory !== "international" && hasInternational) continue;
          }

          // Tính điểm thưởng ghép phòng (cùng khóa, cùng khoa, cùng là du học sinh)
          let sameYearCount = 0;
          let sameFacultyCount = 0;
          let sameYearFacultyCount = 0;
          let sameInternationalCount = 0;

          for (const occupant of occupants) {
            const isSameYear = occupant.year === year;
            const isSameFaculty = studentFaculty && occupant.faculty === studentFaculty;
            
            if (isSameYear) sameYearCount++;
            if (isSameFaculty) sameFacultyCount++;
            if (isSameYear && isSameFaculty) sameYearFacultyCount++;

            // Thưởng thêm điểm nếu cả hai đều là sinh viên quốc tế/nước ngoài
            if (studentCategory === "international" && occupant.isInternational) {
              sameInternationalCount++;
            }
          }

          const score = baseScore + 
                        (sameYearCount * 1.0) + 
                        (sameFacultyCount * 2.0) + 
                        (sameYearFacultyCount * 3.0) +
                        (sameInternationalCount * 4.0);

          if (score > bestScore) {
            bestScore = score;
            bestRoom = room;
          } else if (score === bestScore && bestRoom) {
            const curVac = bestRoom.capacity - bestRoom.current_occupancy;
            const roomVac = room.capacity - room.current_occupancy;
            if (roomVac > curVac) bestRoom = room;
          }
        }

        if (bestRoom) {
          try {
            await this.assignRoom(contract.id, bestRoom.id, adminId, req);
            bestRoom.current_occupancy++;
            assigned++;

            // Cập nhật động bản đồ phân bổ trong bộ nhớ để xếp bạn tiếp theo
            if (!roomOccupantsMap[bestRoom.id]) {
              roomOccupantsMap[bestRoom.id] = [];
            }
            roomOccupantsMap[bestRoom.id].push({
              year,
              faculty: studentFaculty,
              isInternational: studentCategory === "international"
            });

            allocations.push({
              student_name: contract.student_name,
              student_id: contract.snapshot_student_id,
              faculty: contract.snapshot_faculty,
              room_number: bestRoom.room_number,
              building: bestRoom.building,
              status: "Active",
            });
          } catch (err) {
            stillPending++;
            allocations.push({
              student_name: contract.student_name,
              student_id: contract.snapshot_student_id,
              faculty: contract.snapshot_faculty,
              room_number: "Chờ gán phòng",
              building: "N/A",
              status: "Pending",
              error: err.message,
            });
          }
        } else {
          stillPending++;
          allocations.push({
            student_name: contract.student_name,
            student_id: contract.snapshot_student_id,
            faculty: contract.snapshot_faculty,
            room_number: "Chờ gán phòng",
            building: "N/A",
            status: "Pending",
          });
        }
      }

      if (req && processed > 0) {
        await LogSystemDAO.log(
          adminId,
          "AUTO_ASSIGN_ROOMS",
          "student_contracts",
          null,
          null,
          { processed, assigned, stillPending },
          req
        );
      }

      return { processed, assigned, stillPending, allocations };
    } catch (error) {
      throw new Error(`Auto assign pending rooms failed: ${error.message}`);
    }
  }
}

module.exports = new ContractService();
