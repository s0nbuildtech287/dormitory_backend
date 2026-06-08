const BaseDAO = require('./BaseDAO');
const db = require('../config/database');

class RoomDAO extends BaseDAO {
    constructor() {
        super('rooms');
    }

    /**
     * Find rooms by building
     */
    async findByBuilding(building) {
        return this.findAll({ building }, ['floor ASC', 'room_number ASC']);
    }

    /**
     * Get building/floor metadata derived from rooms table
     */
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

    /**
     * Check if any room_number exists in the provided list
     */
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

    /**
     * Create many rooms in one transaction
     */
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

    /**
     * Find available rooms (has space)
     */
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

    /**
     * Search and filter rooms
     */
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
                            'contract_number', sc.contract_number
                        )
                    ) FILTER (WHERE sc.id IS NOT NULL), '[]'::json
                ) AS students
            FROM ${this.tableName} r
            LEFT JOIN student_contracts sc ON sc.room_id = r.id AND sc.status IN ('Active', 'Expired')
            LEFT JOIN users u ON sc.user_id = u.id
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

        // Occupancy filters
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

    /**
     * Get room with students
     */
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
                sc.status as contract_status
            FROM rooms r
            LEFT JOIN student_contracts sc ON r.id = sc.room_id AND sc.status IN ('Active', 'Expired')
            LEFT JOIN users u ON sc.user_id = u.id
            WHERE r.id = $1
        `;
        return this.executeQuery(query, [roomId]);
    }

    /**
     * Increment occupancy
     */
    async incrementOccupancy(roomId) {
        const query = `UPDATE ${this.tableName} SET current_occupancy = current_occupancy + 1 WHERE id = $1`;
        const [result] = await this.executeQuery(query, [roomId]);
        return result.affectedRows > 0;
    }

    /**
     * Decrement occupancy
     */
    async decrementOccupancy(roomId) {
        const query = `UPDATE ${this.tableName} SET current_occupancy = current_occupancy - 1 WHERE id = $1 AND current_occupancy > 0`;
        const [result] = await this.executeQuery(query, [roomId]);
        return result.affectedRows > 0;
    }

    /**
     * Get room statistics
     */
    async getStatistics() {
        // Trả về 1 row tổng hợp toàn bộ
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

    /**
     * Update meter readings
     */
    async updateMeterReadings(roomId, electricReading, waterReading) {
        return this.update(roomId, {
            electric_meter_reading: electricReading,
            water_meter_reading: waterReading
        });
    }
}

module.exports = new RoomDAO();
