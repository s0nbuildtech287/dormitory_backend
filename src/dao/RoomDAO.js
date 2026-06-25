const BaseDAO = require('./BaseDAO');
const db = require('../config/database');

class RoomDAO extends BaseDAO {
    constructor() {
        super('rooms');
    }

    // Tìm phòng theo tòa nhà, sắp xếp theo tầng và số phòng tăng dần
    async findByBuilding(building) {
        return this.findAll({ building }, ['floor ASC', 'room_number ASC']);
    }

    // Lấy số thứ tự phòng tiếp theo để tự động tạo số phòng mới (dạng room-XXX-B-F)
    async getNextRoomSequence(building, floor, fallbackStart = 100) {
        const query = `
            SELECT MAX(
                CASE
                    WHEN split_part(room_number, '-', 2) ~ '^[0-9]+$'
                    THEN CAST(split_part(room_number, '-', 2) AS INTEGER)
                    ELSE NULL
                END
            ) AS max_sequence
            FROM ${this.tableName}
            WHERE building = $1
               AND floor = $2
               AND room_number LIKE 'room-%'
        `;

        const rows = await this.executeQuery(query, [building, floor]);
        const maxSequence = rows[0]?.max_sequence;
        if (maxSequence === null || maxSequence === undefined) {
            return fallbackStart;
        }

        return Number(maxSequence) + 1;
    }

    // Lấy thông tin cấu trúc (số phòng, số tầng) của từng tòa nhà
    async getStructureMetadata() {
        const query = `
            SELECT
                building,
                COUNT(*) AS room_count,
                COUNT(DISTINCT floor) AS floor_count,
                MIN(floor) AS min_floor,
                MAX(floor) AS max_floor,
                ARRAY_AGG(DISTINCT floor ORDER BY floor) AS floors
            FROM ${this.tableName}
            GROUP BY building
            ORDER BY building
        `;

        return this.executeQuery(query);
    }

    // Kiểm tra danh sách số phòng xem có số nào đã tồn tại trong DB chưa
    async findExistingRoomNumbers(roomNumbers = []) {
        if (!roomNumbers.length) return [];

        const query = `
            SELECT room_number
            FROM ${this.tableName}
            WHERE room_number = ANY($1)
        `;

        const rows = await this.executeQuery(query, [roomNumbers]);
        return rows.map((row) => row.room_number);
    }

    // Tạo nhiều phòng cùng lúc trong một transaction
    async createMany(rooms = []) {
        if (!rooms.length) return [];

        const client = await db.connect();
        try {
            await client.query('BEGIN');

            const createdRows = [];
            for (const room of rooms) {
                const columns = Object.keys(room);
                const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
                const values = Object.values(room);

                const query = `
                    INSERT INTO ${this.tableName} (${columns.join(', ')})
                    VALUES (${placeholders})
                    RETURNING *
                `;

                const result = await client.query(query, values);
                createdRows.push(result.rows[0]);
            }

            await client.query('COMMIT');
            return createdRows;
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`Error in createMany ${this.tableName}: ${error.message}`);
        } finally {
            client.release();
        }
    }

    // Tìm các phòng còn chỗ trống (ưu tiên lọc theo loại giới tính phòng)
    async findAvailableRooms(genderType = null) {
        let query = `SELECT * FROM ${this.tableName} WHERE current_occupancy < capacity AND status = 'Active'`;
        const values = [];

        if (genderType) {
            query += ` AND gender_type = $1`;
            values.push(genderType);
        }

        query += ` ORDER BY building, floor, room_number`;
        return this.executeQuery(query, values);
    }

    // Tìm kiếm và lọc danh sách phòng kèm theo thông tin sinh viên hiện tại
    async searchAndFilter(filters = {}) {
        let paramIndex = 1;
        const values = [];

        let query = `
            SELECT r.*,
                r.current_occupancy AS "currentOccupancy",
                COALESCE(
                    json_agg(
                        json_build_object(
                            'student_name', u.full_name,
                            'student_id', sc.snapshot_student_id,
                            'email', u.email,
                            'contract_number', sc.contract_number,
                            'snapshot_year', sc.snapshot_year,
                            'priority_reasons', rf.priority_reasons,
                            'volunteer_role', sc.volunteer_role,
                            'contract_id', sc.id
                        )
                    ) FILTER (WHERE sc.id IS NOT NULL), '[]'::json
                ) AS students
            FROM ${this.tableName} r
            LEFT JOIN student_contracts sc ON sc.room_id = r.id AND sc.status IN ('Active', 'Expired')
            LEFT JOIN users u ON sc.user_id = u.id
            LEFT JOIN register_forms rf ON sc.register_form_id = rf.id
            WHERE 1=1
        `;

        if (filters.building) {
            query += ` AND r.building = $${paramIndex++}`;
            values.push(filters.building);
        }

        if (filters.genderType) {
            query += ` AND r.gender_type = $${paramIndex++}`;
            values.push(filters.genderType);
        }

        if (filters.status) {
            query += ` AND r.status = $${paramIndex++}`;
            values.push(filters.status);
        }

        if (filters.searchTerm) {
            query += ` AND r.room_number ILIKE $${paramIndex++}`;
            values.push(`%${filters.searchTerm}%`);
        }

        // Lọc theo trạng thái số người trong phòng
        if (filters.occupancyStatus === 'Full') {
            query += ` AND r.current_occupancy >= r.capacity`;
        } else if (filters.occupancyStatus === 'Available') {
            query += ` AND r.current_occupancy > 0 AND r.current_occupancy < r.capacity`;
        } else if (filters.occupancyStatus === 'Empty') {
            query += ` AND r.current_occupancy = 0`;
        }

        query += ` GROUP BY r.id ORDER BY r.building, r.floor, r.room_number`;
        return this.executeQuery(query, values);
    }

    // Lấy thông tin phòng chi tiết kèm danh sách sinh viên đang ở
    async getRoomWithStudents(roomId) {
        const query = `
            SELECT 
                r.*,
                u.id as student_id,
                u.full_name as student_name,
                u.email as student_email,
                u.phone as student_phone,
                sc.contract_number,
                sc.start_date,
                sc.end_date,
                sc.status as contract_status,
                sc.snapshot_year,
                rf.priority_reasons,
                sc.volunteer_role,
                sc.id as contract_id
            FROM rooms r
            LEFT JOIN student_contracts sc ON r.id = sc.room_id AND sc.status IN ('Active', 'Expired')
            LEFT JOIN users u ON sc.user_id = u.id
            LEFT JOIN register_forms rf ON sc.register_form_id = rf.id
            WHERE r.id = $1
        `;
        return this.executeQuery(query, [roomId]);
    }

    // Tăng số người thực tế trong phòng lên 1
    async incrementOccupancy(roomId) {
        const query = `UPDATE ${this.tableName} SET current_occupancy = current_occupancy + 1 WHERE id = $1 RETURNING *`;
        const rows = await this.executeQuery(query, [roomId]);
        return rows.length > 0;
    }

    // Giảm số người thực tế trong phòng xuống 1
    async decrementOccupancy(roomId) {
        const query = `UPDATE ${this.tableName} SET current_occupancy = current_occupancy - 1 WHERE id = $1 AND current_occupancy > 0 RETURNING *`;
        const rows = await this.executeQuery(query, [roomId]);
        return rows.length > 0;
    }

    // Thống kê tổng số phòng, số sinh viên, và tỷ lệ lấp đầy
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_rooms,
                SUM(capacity) as total_capacity,
                SUM(current_occupancy) as total_occupancy,
                COUNT(CASE WHEN current_occupancy > 0 THEN 1 END) as occupied_rooms,
                COUNT(CASE WHEN current_occupancy = 0 THEN 1 END) as empty_rooms,
                COUNT(CASE WHEN current_occupancy < capacity THEN 1 END) as available_rooms,
                ROUND(
                    CASE WHEN SUM(capacity) > 0 
                    THEN SUM(current_occupancy)::numeric / SUM(capacity) * 100 
                    ELSE 0 END, 1
                ) as occupancy_rate
            FROM ${this.tableName}
            WHERE status = 'Active'
        `;
        const result = await this.executeQuery(query);
        return result[0] || {};
    }

    // Cập nhật chỉ số điện, nước mới cho phòng
    async updateMeterReadings(roomId, electricReading, waterReading) {
        return this.update(roomId, {
            electric_meter_reading: electricReading,
            water_meter_reading: waterReading
        });
    }

    // Đếm tổng số giường còn trống của các phòng đang hoạt động
    async countAvailableRooms() {
        const query = `
            SELECT COALESCE(SUM(capacity - current_occupancy), 0) AS available_slots
            FROM ${this.tableName}
            WHERE status = 'Active' AND current_occupancy < capacity
        `;
        const result = await this.executeQuery(query);
        return parseInt(result[0]?.available_slots || 0, 10);
    }

    // Thống kê số giường trống theo tòa và tầng (phục vụ biểu đồ heatmap)
    async countAvailableByBuilding() {
        const query = `
            SELECT
                building,
                floor,
                COUNT(*) AS total_rooms,
                SUM(capacity) AS total_capacity,
                SUM(current_occupancy) AS total_occupancy,
                SUM(capacity - current_occupancy) AS available_slots,
                ROUND(
                    CASE WHEN SUM(capacity) > 0
                    THEN SUM(current_occupancy)::numeric / SUM(capacity) * 100
                    ELSE 0 END, 0
                ) AS occupancy_pct
            FROM ${this.tableName}
            WHERE status = 'Active'
            GROUP BY building, floor
            ORDER BY building, floor
        `;
        return this.executeQuery(query);
    }
}

module.exports = new RoomDAO();
