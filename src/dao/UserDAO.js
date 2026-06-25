const BaseDAO = require('./BaseDAO');

class UserDAO extends BaseDAO {
    constructor() {
        super('users');
    }

    // Tìm kiếm người dùng theo email
    async findByEmail(email) {
        return this.findOne({ email });
    }

    // Tìm kiếm danh sách người dùng theo vai trò (role)
    async findByRole(role) {
        return this.findAll({ role });
    }

    // Tìm kiếm người dùng theo tên hoặc email (hỗ trợ lọc theo role)
    async search(searchTerm, role = null) {
        let query = `SELECT * FROM ${this.tableName} WHERE (full_name ILIKE $1 OR email ILIKE $2)`;
        const values = [`%${searchTerm}%`, `%${searchTerm}%`];

        if (role) {
            query += ` AND role = $3`;
            values.push(role);
        }

        return this.executeQuery(query, values);
    }

    // Lấy thông tin người dùng kèm theo danh sách hợp đồng
    async getUserWithContracts(userId) {
        const query = `
            SELECT u.*, sc.* 
            FROM users u
            LEFT JOIN student_contracts sc ON u.id = sc.user_id
            WHERE u.id = $1
            ORDER BY sc.created_at DESC
        `;
        return this.executeQuery(query, [userId]);
    }
}

module.exports = new UserDAO();
