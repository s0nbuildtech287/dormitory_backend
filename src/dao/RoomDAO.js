const BaseDAO = require('./BaseDAO');

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
     * Find available rooms (has space)
     */
    async findAvailableRooms(genderType = null) {
        let query = `SELECT * FROM ${this.tableName} WHERE current_occupancy < capacity AND status = 'Active'`;
        const values = [];

        if (genderType) {
            query += ` AND gender_type = ?`;
            values.push(genderType);
        }

        query += ` ORDER BY building, floor, room_number`;
        return this.executeQuery(query, values);
    }

    /**
     * Search and filter rooms
     */
    async searchAndFilter(filters = {}) {
        let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
        const values = [];

        if (filters.building) {
            query += ` AND building = ?`;
            values.push(filters.building);
        }

        if (filters.genderType) {
            query += ` AND gender_type = ?`;
            values.push(filters.genderType);
        }

        if (filters.status) {
            query += ` AND status = ?`;
            values.push(filters.status);
        }

        if (filters.searchTerm) {
            query += ` AND room_number LIKE ?`;
            values.push(`%${filters.searchTerm}%`);
        }

        // Occupancy filters
        if (filters.occupancyStatus === 'Full') {
            query += ` AND current_occupancy >= capacity`;
        } else if (filters.occupancyStatus === 'Available') {
            query += ` AND current_occupancy > 0 AND current_occupancy < capacity`;
        } else if (filters.occupancyStatus === 'Empty') {
            query += ` AND current_occupancy = 0`;
        }

        query += ` ORDER BY building, floor, room_number`;
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
                sc.end_date
            FROM rooms r
            LEFT JOIN student_contracts sc ON r.id = sc.room_id AND sc.status = 'Active'
            LEFT JOIN users u ON sc.user_id = u.id
            WHERE r.id = ?
        `;
        return this.executeQuery(query, [roomId]);
    }

    /**
     * Increment occupancy
     */
    async incrementOccupancy(roomId) {
        const query = `UPDATE ${this.tableName} SET current_occupancy = current_occupancy + 1 WHERE id = ?`;
        const [result] = await this.executeQuery(query, [roomId]);
        return result.affectedRows > 0;
    }

    /**
     * Decrement occupancy
     */
    async decrementOccupancy(roomId) {
        const query = `UPDATE ${this.tableName} SET current_occupancy = current_occupancy - 1 WHERE id = ? AND current_occupancy > 0`;
        const [result] = await this.executeQuery(query, [roomId]);
        return result.affectedRows > 0;
    }

    /**
     * Get room statistics
     */
    async getStatistics() {
        const query = `
            SELECT 
                building,
                gender_type,
                COUNT(*) as total_rooms,
                SUM(capacity) as total_capacity,
                SUM(current_occupancy) as total_occupancy,
                ROUND(SUM(current_occupancy) / SUM(capacity) * 100, 2) as occupancy_rate
            FROM ${this.tableName}
            WHERE status = 'Active'
            GROUP BY building, gender_type
        `;
        return this.executeQuery(query);
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
