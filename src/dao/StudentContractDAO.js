const BaseDAO = require("./BaseDAO");
const db = require("../config/database");

class StudentContractDAO extends BaseDAO {
  constructor() {
    super("student_contracts");
  }

  /**
   * Find contracts by user ID
   */
  async findByUserId(userId) {
    return this.findAll({ user_id: userId }, ["created_at DESC"]);
  }

  /**
   * Find contracts by room ID
   */
  async findByRoomId(roomId) {
    return this.findAll({ room_id: roomId, status: "Active" });
  }

  /**
   * Find active contract by user
   */
  async findActiveContractByUser(userId) {
    return this.findOne({ user_id: userId, status: "Active" });
  }

  /**
   * Get contract with full details (user, room, registration info)
   */
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

  /**
   * Search and filter contracts (supports 'Pending'|'Active'|'All')
   */
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


  /**
   * Create a Pending contract record (no room yet)
   * Used when admin approves a registration form
   */
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

  /**
   * Assign room to a Pending contract (atomic: update contract + increment room occupancy)
   */
  async assignRoom(contractId, roomId) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Validate room still has capacity
      const roomRes = await client.query(`SELECT capacity, current_occupancy, gender_type, status FROM rooms WHERE id = $1 FOR UPDATE`, [roomId]);
      if (roomRes.rows.length === 0) throw new Error("Room not found");
      const room = roomRes.rows[0];
      if (room.status !== "Active") throw new Error("Room is not active");
      if (room.current_occupancy >= room.capacity) throw new Error("Room is full");

      // Validate contract is still Pending
      const contractRes = await client.query(`SELECT status, snapshot_gender FROM ${this.tableName} WHERE id = $1 FOR UPDATE`, [contractId]);
      if (contractRes.rows.length === 0) throw new Error("Contract not found");
      const contract = contractRes.rows[0];
      if (contract.status !== "Pending") throw new Error("Contract is not in Pending status");

      // Validate gender match
      if (contract.snapshot_gender && room.gender_type !== contract.snapshot_gender) {
        throw new Error(`Gender mismatch: room is ${room.gender_type}, student is ${contract.snapshot_gender}`);
      }

      // Update contract → Active, assign room, set signed_at
      await client.query(
        `UPDATE ${this.tableName}
                 SET room_id = $1, status = 'Active', signed_at = NOW(), updated_at = NOW()
                 WHERE id = $2`,
        [roomId, contractId],
      );

      // Increment room occupancy
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

  /**
   * Transfer room for an Active contract (atomic: decrement old room occupancy + increment new room occupancy + update contract)
   */
  async transferRoom(contractId, oldRoomId, newRoomId) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Decrement old room occupancy
      if (oldRoomId) {
        await client.query(`UPDATE rooms SET current_occupancy = GREATEST(current_occupancy - 1, 0), updated_at = NOW() WHERE id = $1`, [oldRoomId]);
      }

      // Increment new room occupancy
      await client.query(`UPDATE rooms SET current_occupancy = current_occupancy + 1, updated_at = NOW() WHERE id = $1`, [newRoomId]);

      // Update contract
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

  /**
   * Create contract and update room occupancy in one transaction (for manual creation)
   */
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

  /**
   * Terminate contract and update room occupancy
   */
  async terminateContract(contractId) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const contractRes = await client.query(`SELECT room_id FROM ${this.tableName} WHERE id = $1`, [contractId]);
      if (contractRes.rows.length === 0) throw new Error("Contract not found");

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

  /**
   * Get top suggested rooms for a pending contract based on gender + year + faculty matching
   * Scoring: Ưu tiên phòng có nhiều SV cùng năm + cùng khoa, rồi đến phòng gần đầy
   */
  async getSuggestedRooms(gender, year, faculty = null, limit = 5) {
    const query = `
            SELECT
                r.id,
                r.room_number,
                r.building,
                r.floor,
                r.capacity,
                r.current_occupancy,
                r.rent_price,
                r.capacity - r.current_occupancy AS available_slots,
                COUNT(sc.id) FILTER (
                    WHERE sc.status = 'Active' AND sc.snapshot_year = $2
                ) AS same_year_count,
                COUNT(sc.id) FILTER (
                    WHERE sc.status = 'Active' AND sc.snapshot_faculty = $4
                ) AS same_faculty_count,
                COUNT(sc.id) FILTER (
                    WHERE sc.status = 'Active' AND sc.snapshot_year = $2 AND sc.snapshot_faculty = $4
                ) AS same_year_faculty_count,
                ROUND(
                    (COUNT(sc.id) FILTER (
                        WHERE sc.status = 'Active' AND sc.snapshot_year = $2 AND sc.snapshot_faculty = $4
                    ) * 100.0 / NULLIF(r.capacity, 0))
                , 1) AS match_score
            FROM rooms r
            LEFT JOIN student_contracts sc ON sc.room_id = r.id AND sc.status = 'Active'
            WHERE r.gender_type = $1
              AND r.status = 'Active'
              AND r.current_occupancy < r.capacity
            GROUP BY r.id
            ORDER BY match_score DESC, same_year_faculty_count DESC, r.current_occupancy DESC
            LIMIT $3
        `;
    return this.executeQuery(query, [gender, year, limit, faculty]);
  }

  /**
   * Get expiring contracts (within next N days)
   */
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

  /**
   * Get statistics: count by status
   */
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
