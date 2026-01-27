const BaseDAO = require('./BaseDAO');

class StudentContractDAO extends BaseDAO {
    constructor() {
        super('student_contracts');
    }

    /**
     * Find contracts by user ID
     */
    async findByUserId(userId) {
        return this.findAll({ user_id: userId }, ['created_at DESC']);
    }

    /**
     * Find contracts by room ID
     */
    async findByRoomId(roomId) {
        return this.findAll({ room_id: roomId, status: 'Active' });
    }

    /**
     * Find active contract by user
     */
    async findActiveContractByUser(userId) {
        return this.findOne({ user_id: userId, status: 'Active' });
    }

    /**
     * Get contract with full details (user, room, registration info)
     */
    async getContractDetails(contractId) {
        const query = `
            SELECT 
                sc.*,
                u.full_name as student_name,
                u.email as student_email,
                u.phone as student_phone,
                r.room_number,
                r.building,
                r.floor,
                rf.student_id
            FROM ${this.tableName} sc
            LEFT JOIN users u ON sc.user_id = u.id
            LEFT JOIN rooms r ON sc.room_id = r.id
            LEFT JOIN register_forms rf ON sc.register_form_id = rf.id
            WHERE sc.id = ?
        `;
        const results = await this.executeQuery(query, [contractId]);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Search and filter contracts
     */
    async searchAndFilter(filters = {}) {
        let query = `
            SELECT 
                sc.*,
                u.full_name as student_name,
                u.email as student_email,
                r.room_number,
                r.building
            FROM ${this.tableName} sc
            LEFT JOIN users u ON sc.user_id = u.id
            LEFT JOIN rooms r ON sc.room_id = r.id
            WHERE 1=1
        `;
        const values = [];

        if (filters.status) {
            query += ` AND sc.status = ?`;
            values.push(filters.status);
        }

        if (filters.roomId) {
            query += ` AND sc.room_id = ?`;
            values.push(filters.roomId);
        }

        if (filters.searchTerm) {
            query += ` AND (u.full_name LIKE ? OR sc.contract_number LIKE ?)`;
            values.push(`%${filters.searchTerm}%`, `%${filters.searchTerm}%`);
        }

        query += ` ORDER BY sc.created_at DESC`;
        return this.executeQuery(query, values);
    }

    /**
     * Create contract and update room occupancy
     */
    async createContractWithRoom(contractData) {
        const db = require('../config/database');
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Create contract
            const [result] = await connection.query(
                `INSERT INTO ${this.tableName} SET ?`,
                [contractData]
            );

            // Update room occupancy
            await connection.query(
                `UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE id = ?`,
                [contractData.room_id]
            );

            await connection.commit();
            return { id: contractData.id, ...contractData };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Terminate contract and update room occupancy
     */
    async terminateContract(contractId) {
        const db = require('../config/database');
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Get contract details
            const [contracts] = await connection.query(
                `SELECT room_id FROM ${this.tableName} WHERE id = ?`,
                [contractId]
            );

            if (contracts.length === 0) {
                throw new Error('Contract not found');
            }

            // Update contract status
            await connection.query(
                `UPDATE ${this.tableName} SET status = 'Terminated' WHERE id = ?`,
                [contractId]
            );

            // Decrease room occupancy
            await connection.query(
                `UPDATE rooms SET current_occupancy = current_occupancy - 1 WHERE id = ? AND current_occupancy > 0`,
                [contracts[0].room_id]
            );

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get expiring contracts (within next 30 days)
     */
    async getExpiringContracts(days = 30) {
        const query = `
            SELECT 
                sc.*,
                u.full_name as student_name,
                u.email as student_email,
                r.room_number
            FROM ${this.tableName} sc
            LEFT JOIN users u ON sc.user_id = u.id
            LEFT JOIN rooms r ON sc.room_id = r.id
            WHERE sc.status = 'Active' 
            AND sc.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            ORDER BY sc.end_date ASC
        `;
        return this.executeQuery(query, [days]);
    }
}

module.exports = new StudentContractDAO();
