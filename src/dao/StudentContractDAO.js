const BaseDAO = require("./BaseDAO");
const db = require("../config/database");

function checkIsInternational(priorityReasons) {
  if (!priorityReasons) return false;
  const normalized = priorityReasons
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return ["luu hoc sinh", "quoc te", "nuoc ngoai", "du hoc sinh", "du hoc", "lao", "campuchia"].some(kw => normalized.includes(kw));
}

class StudentContractDAO extends BaseDAO {
  constructor() {
    super("student_contracts");
  }

  // Tìm danh sách hợp đồng theo ID người dùng
  async findByUserId(userId) {
    return this.findAll({ user_id: userId }, ["created_at DESC"]);
  }

  // Tìm danh sách hợp đồng đang hoạt động trong phòng
  async findByRoomId(roomId) {
    return this.findAll({ room_id: roomId, status: "Active" });
  }

  // Tìm hợp đồng đang hoạt động của người dùng
  async findActiveContractByUser(userId) {
    return this.findOne({ user_id: userId, status: "Active" });
  }

  // Lấy chi tiết hợp đồng kèm thông tin sinh viên, phòng và đơn đăng ký
  async getContractDetails(contractId) {
    const query = `
            SELECT 
                sc.*,
                u.full_name AS student_name,
                u.email    AS student_email,
                u.phone    AS student_phone,
                u.avatar   AS student_avatar,
                r.room_number,
                r.building,
                r.floor,
                r.rent_price AS room_price,
                r.garbage_fee AS room_garbage_fee,
                r.internet_fee AS room_internet_fee,
                r.parking_fee AS room_parking_fee,
                r.capacity AS room_capacity,
                r.current_occupancy AS room_occupancy,
                r.area AS room_area,
                r.gender_type AS room_gender_type,
                rf.student_id  AS rf_student_id,
                rf.faculty     AS rf_faculty,
                rf.year        AS rf_year,
                rf.gpa         AS rf_gpa,
                rf.gender      AS rf_gender,
                rf.cccd        AS rf_cccd,
                rf.address     AS rf_address,
                rf.phone_number AS rf_phone,
                rf.priority_reasons AS rf_priority_reasons
            FROM ${this.tableName} sc
            LEFT JOIN users u ON sc.user_id = u.id
            LEFT JOIN rooms r ON sc.room_id = r.id
            LEFT JOIN register_forms rf ON sc.register_form_id = rf.id
            WHERE sc.id = $1
        `;
    const results = await this.executeQuery(query, [contractId]);
    return results.length > 0 ? results[0] : null;
  }

  // Tìm kiếm và lọc hợp đồng (hỗ trợ lọc theo trạng thái Pending, Active, Expired...)
  async searchAndFilter(filters = {}) {
      let paramIndex = 1;
      const values = [];

      let query = `
              SELECT 
                  sc.*,
                  u.full_name    AS student_name,
                  u.email        AS student_email,
                  u.avatar       AS student_avatar,
                  r.room_number,
                  r.building,
                  rf.student_id  AS rf_student_id,
                  rf.priority_reasons AS rf_priority_reasons,
                  rf.ai_score    AS rf_ai_score
              FROM ${this.tableName} sc
              LEFT JOIN users u ON sc.user_id = u.id
              LEFT JOIN rooms r ON sc.room_id = r.id
              LEFT JOIN register_forms rf ON sc.register_form_id = rf.id
              WHERE 1=1
          `;

      if (filters.status) {
        query += ` AND sc.status = $${paramIndex++}`;
        values.push(filters.status);
      }

      if (filters.roomId) {
        query += ` AND sc.room_id = $${paramIndex++}`;
        values.push(filters.roomId);
      }

      if (filters.searchTerm) {
        query += ` AND (u.full_name ILIKE $${paramIndex} OR sc.contract_number ILIKE $${paramIndex + 1} OR sc.snapshot_student_id ILIKE $${paramIndex + 2} OR rf.student_id ILIKE $${paramIndex + 3})`;
        values.push(`%${filters.searchTerm}%`, `%${filters.searchTerm}%`, `%${filters.searchTerm}%`, `%${filters.searchTerm}%`);
        paramIndex += 4;
      }

      query += ` ORDER BY sc.created_at DESC`;
      return this.executeQuery(query, values);
    }

  // Tạo hợp đồng ở trạng thái chờ xếp phòng (Pending) khi đơn đăng ký được duyệt
  async createPendingContract(contractData) {
    const columns = Object.keys(contractData);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const values = Object.values(contractData);
    const query = `
            INSERT INTO ${this.tableName} (${columns.join(", ")})
            VALUES (${placeholders})
            RETURNING *
        `;
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Xếp sinh viên vào phòng (cập nhật trạng thái hợp đồng thành Active và tăng số người trong phòng)
  // Rút phòng: đưa hợp đồng Active về Pending, giảm current_occupancy phòng cũ
  async unassignRoom(contractId) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Lấy room_id hiện tại
      const contractRes = await client.query(
        `SELECT room_id, status FROM ${this.tableName} WHERE id = $1 FOR UPDATE`,
        [contractId]
      );
      if (contractRes.rows.length === 0) throw new Error("Không tìm thấy hợp đồng");
      const { room_id, status } = contractRes.rows[0];
      if (status !== "Active") throw new Error("Hợp đồng không ở trạng thái Active");
      if (!room_id) throw new Error("Hợp đồng chưa có phòng");

      // Đưa hợp đồng về Pending, xóa room_id và signed_at
      await client.query(
        `UPDATE ${this.tableName}
         SET room_id = NULL, status = 'Pending', signed_at = NULL, contract_number = NULL,
             rent_price = NULL, volunteer_role = NULL, updated_at = NOW()
         WHERE id = $1`,
        [contractId]
      );

      // Giảm current_occupancy phòng cũ
      await client.query(
        `UPDATE rooms SET current_occupancy = GREATEST(current_occupancy - 1, 0), updated_at = NOW() WHERE id = $1`,
        [room_id]
      );

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async assignRoom(contractId, roomId) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Khóa và kiểm tra thông tin phòng
      const roomRes = await client.query(`SELECT capacity, current_occupancy, gender_type, status FROM rooms WHERE id = $1 FOR UPDATE`, [roomId]);
      if (roomRes.rows.length === 0) throw new Error("Không tìm thấy phòng");
      const room = roomRes.rows[0];
      if (room.status !== "Active") throw new Error("Phòng hiện không hoạt động");
      if (room.current_occupancy >= room.capacity) throw new Error("Phòng đã đầy");

      // Khóa và kiểm tra trạng thái hợp đồng
      const contractRes = await client.query(
        `SELECT status, snapshot_gender, register_form_id 
         FROM ${this.tableName} 
         WHERE id = $1 FOR UPDATE`,
        [contractId]
      );
      if (contractRes.rows.length === 0) throw new Error("Không tìm thấy hợp đồng");
      const contract = contractRes.rows[0];
      if (contract.status !== "Pending") throw new Error("Hợp đồng không ở trạng thái chờ xếp phòng");

      // Lấy thông tin lý do ưu tiên từ register_forms
      let priorityReasons = "";
      if (contract.register_form_id) {
        const rfRes = await client.query(`SELECT priority_reasons FROM register_forms WHERE id = $1`, [contract.register_form_id]);
        if (rfRes.rows.length > 0) {
          priorityReasons = rfRes.rows[0].priority_reasons || "";
        }
      }

      // Kiểm tra sự phù hợp về giới tính
      if (contract.snapshot_gender && room.gender_type !== contract.snapshot_gender) {
        throw new Error(`Giới tính không phù hợp: Phòng dành cho ${room.gender_type}, Sinh viên giới tính ${contract.snapshot_gender}`);
      }

      // Ràng buộc cứng diện quốc tịch (quốc tế vs Việt Nam)
      const isStudentInternational = checkIsInternational(priorityReasons);
      const occupantsRes = await client.query(
        `SELECT rf.priority_reasons
         FROM ${this.tableName} sc
         LEFT JOIN register_forms rf ON sc.register_form_id = rf.id
         WHERE sc.room_id = $1 AND sc.status = 'Active'`,
        [roomId]
      );
      if (occupantsRes.rows.length > 0) {
        const hasInternationalOccupant = occupantsRes.rows.some(o => checkIsInternational(o.priority_reasons));
        if (isStudentInternational && !hasInternationalOccupant) {
          throw new Error("Không thể xếp sinh viên quốc tế ở chung phòng với sinh viên Việt Nam");
        }
        if (!isStudentInternational && hasInternationalOccupant) {
          throw new Error("Không thể xếp sinh viên Việt Nam ở chung phòng với sinh viên quốc tế");
        }
      }

      // Cập nhật hợp đồng sang Active và điền thông tin phòng
      await client.query(
        `UPDATE ${this.tableName}
                 SET room_id = $1, status = 'Active', signed_at = NOW(), updated_at = NOW()
                 WHERE id = $2`,
        [roomId, contractId],
      );

      // Tăng số người thực tế trong phòng
      await client.query(`UPDATE rooms SET current_occupancy = current_occupancy + 1, updated_at = NOW() WHERE id = $1`, [roomId]);

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Chuyển phòng cho sinh viên (giảm số người phòng cũ, tăng số người phòng mới và cập nhật hợp đồng)
  async transferRoom(contractId, oldRoomId, newRoomId) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Ràng buộc cứng diện quốc tịch (quốc tế vs Việt Nam) cho phòng mới
      const contractRes = await client.query(
        `SELECT rf.priority_reasons 
         FROM ${this.tableName} sc
         LEFT JOIN register_forms rf ON sc.register_form_id = rf.id
         WHERE sc.id = $1`,
        [contractId]
      );
      if (contractRes.rows.length === 0) throw new Error("Không tìm thấy hợp đồng");
      const contract = contractRes.rows[0];
      const isStudentInternational = checkIsInternational(contract.priority_reasons);

      const occupantsRes = await client.query(
        `SELECT rf.priority_reasons
         FROM ${this.tableName} sc
         LEFT JOIN register_forms rf ON sc.register_form_id = rf.id
         WHERE sc.room_id = $1 AND sc.status = 'Active'`,
        [newRoomId]
      );
      if (occupantsRes.rows.length > 0) {
        const hasInternationalOccupant = occupantsRes.rows.some(o => checkIsInternational(o.priority_reasons));
        if (isStudentInternational && !hasInternationalOccupant) {
          throw new Error("Không thể chuyển sinh viên quốc tế vào phòng có sinh viên Việt Nam");
        }
        if (!isStudentInternational && hasInternationalOccupant) {
          throw new Error("Không thể chuyển sinh viên Việt Nam vào phòng có sinh viên quốc tế");
        }
      }

      // Giảm số người phòng cũ
      if (oldRoomId) {
        await client.query(`UPDATE rooms SET current_occupancy = GREATEST(current_occupancy - 1, 0), updated_at = NOW() WHERE id = $1`, [oldRoomId]);
      }

      // Tăng số người phòng mới
      await client.query(`UPDATE rooms SET current_occupancy = current_occupancy + 1, updated_at = NOW() WHERE id = $1`, [newRoomId]);

      // Cập nhật số phòng mới trong hợp đồng
      await client.query(
        `UPDATE ${this.tableName}
         SET room_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [newRoomId, contractId]
      );

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Tạo hợp đồng trực tiếp đã xếp phòng trong cùng một transaction
  async createContractWithRoom(contractData) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const columns = Object.keys(contractData);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      const values = Object.values(contractData);

      const insertRes = await client.query(`INSERT INTO ${this.tableName} (${columns.join(", ")}) VALUES (${placeholders}) RETURNING *`, values);

      if (contractData.room_id) {
        await client.query(`UPDATE rooms SET current_occupancy = current_occupancy + 1, updated_at = NOW() WHERE id = $1`, [contractData.room_id]);
      }

      await client.query("COMMIT");
      return insertRes.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Chấm dứt hợp đồng sớm và cập nhật số người trong phòng tương ứng
  async terminateContract(contractId) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const contractRes = await client.query(`SELECT room_id FROM ${this.tableName} WHERE id = $1`, [contractId]);
      if (contractRes.rows.length === 0) throw new Error("Không tìm thấy hợp đồng");

      const { room_id } = contractRes.rows[0];

      await client.query(`UPDATE ${this.tableName} SET status = 'Terminated', updated_at = NOW() WHERE id = $1`, [contractId]);

      if (room_id) {
        await client.query(`UPDATE rooms SET current_occupancy = GREATEST(current_occupancy - 1, 0), updated_at = NOW() WHERE id = $1`, [room_id]);
      }

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Đề xuất danh sách phòng phù hợp cho sinh viên (dựa trên giới tính, số khóa học, cùng khoa...)
  async getSuggestedRooms(gender, year, faculty = null) {
    const query = `
            SELECT
                r.id,
                r.room_number,
                r.building,
                r.floor,
                r.capacity,
                r.current_occupancy,
                r.rent_price,
                r.reserved_for,
                r.capacity - r.current_occupancy AS available_slots,
                COUNT(sc.id) FILTER (
                    WHERE sc.status = 'Active' AND sc.snapshot_year = $2
                ) AS same_year_count,
                COUNT(sc.id) FILTER (
                    WHERE sc.status = 'Active' AND sc.snapshot_faculty = $3
                ) AS same_faculty_count,
                COUNT(sc.id) FILTER (
                    WHERE sc.status = 'Active' AND sc.snapshot_year = $2 AND sc.snapshot_faculty = $3
                ) AS same_year_faculty_count,
                ROUND(
                    (COUNT(sc.id) FILTER (
                        WHERE sc.status = 'Active' AND sc.snapshot_year = $2 AND sc.snapshot_faculty = $3
                    ) * 100.0 / NULLIF(r.capacity, 0))
                , 1) AS match_score,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'name',     u.full_name,
                            'year',     sc.snapshot_year,
                            'faculty',  sc.snapshot_faculty,
                            'priority', rf.priority_reasons
                        ) ORDER BY u.full_name
                    ) FILTER (WHERE sc.id IS NOT NULL AND sc.status = 'Active'),
                    '[]'
                ) AS occupants
            FROM rooms r
            LEFT JOIN student_contracts sc ON sc.room_id = r.id AND sc.status = 'Active'
            LEFT JOIN users u ON sc.user_id = u.id
            LEFT JOIN register_forms rf ON sc.register_form_id = rf.id
            WHERE r.gender_type = $1
              AND r.status = 'Active'
              AND r.current_occupancy < r.capacity
            GROUP BY r.id
            ORDER BY match_score DESC, same_year_faculty_count DESC, r.current_occupancy DESC
        `;
    return this.executeQuery(query, [gender, year, faculty]);
  }

  // Tìm kiếm danh sách các hợp đồng sắp hết hạn (trong vòng N ngày)
  async getExpiringContracts(days = 30) {
    const query = `
            SELECT 
                sc.*,
                u.full_name AS student_name,
                u.email    AS student_email,
                r.room_number
            FROM ${this.tableName} sc
            LEFT JOIN users u ON sc.user_id = u.id
            LEFT JOIN rooms r ON sc.room_id = r.id
            WHERE sc.status = 'Active'
              AND sc.end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + ($1 || ' days')::INTERVAL)
            ORDER BY sc.end_date ASC
        `;
    return this.executeQuery(query, [days]);
  }

  // Thống kê số lượng hợp đồng theo từng trạng thái (Pending, Active, Expired...)
  async getStats() {
    const query = `
            SELECT
                COUNT(*) FILTER (WHERE status = 'Pending')    AS pending_count,
                COUNT(*) FILTER (WHERE status = 'Active')     AS active_count,
                COUNT(*) FILTER (WHERE status = 'Expired')    AS expired_count,
                COUNT(*) FILTER (WHERE status = 'Terminated') AS terminated_count,
                COUNT(*)                                       AS total_count
            FROM ${this.tableName}
        `;
    const results = await this.executeQuery(query, []);
    return results[0];
  }
}

module.exports = new StudentContractDAO();
