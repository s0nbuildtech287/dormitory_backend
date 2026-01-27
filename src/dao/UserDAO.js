const BaseDAO = require('./BaseDAO');

class UserDAO extends BaseDAO {
    constructor() {
        super('users');
    }

    /**
     * Find user by email
     */
    async findByEmail(email) {
        return this.findOne({ email });
    }

    /**
     * Find users by role
     */
    async findByRole(role) {
        return this.findAll({ role });
    }

    /**
     * Search users
     */
    async search(searchTerm, role = null) {
        let query = `SELECT * FROM ${this.tableName} WHERE (full_name LIKE ? OR email LIKE ?)`;
        const values = [`%${searchTerm}%`, `%${searchTerm}%`];

        if (role) {
            query += ` AND role = ?`;
            values.push(role);
        }

        return this.executeQuery(query, values);
    }

    /**
     * Get user with contracts
     */
    async getUserWithContracts(userId) {
        const query = `
            SELECT u.*, sc.* 
            FROM users u
            LEFT JOIN student_contracts sc ON u.id = sc.user_id
            WHERE u.id = ?
            ORDER BY sc.created_at DESC
        `;
        return this.executeQuery(query, [userId]);
    }
}

module.exports = new UserDAO();
