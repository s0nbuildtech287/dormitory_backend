const db = require('../config/database');

/**
 * Lớp DAO cơ sở định nghĩa các thao tác CRUD dùng chung cho database.
 * Các lớp DAO cụ thể sẽ kế thừa từ lớp này.
 */
class BaseDAO {
    constructor(tableName) {
        this.tableName = tableName;
    }

    // Lấy danh sách bản ghi theo điều kiện lọc, sắp xếp và phân trang
    async findAll(conditions = {}, orderBy = [], limit = null, offset = null) {
        try {
            let query = `SELECT * FROM ${this.tableName}`;
            const values = [];
            let paramIndex = 1;

            // Thêm điều kiện WHERE động
            if (Object.keys(conditions).length > 0) {
                const whereConditions = Object.keys(conditions).map(key => {
                    values.push(conditions[key]);
                    return `${key} = $${paramIndex++}`;
                });
                query += ` WHERE ${whereConditions.join(' AND ')}`;
            }

            // Thêm điều kiện sắp xếp ORDER BY
            if (orderBy.length > 0) {
                query += ` ORDER BY ${orderBy.join(', ')}`;
            }

            // Thêm LIMIT và OFFSET để phân trang
            if (limit) {
                query += ` LIMIT $${paramIndex++}`;
                values.push(limit);
                if (offset) {
                    query += ` OFFSET $${paramIndex++}`;
                    values.push(offset);
                }
            }

            const result = await db.query(query, values);
            return result.rows;
        } catch (error) {
            throw new Error(`Error in findAll ${this.tableName}: ${error.message}`);
        }
    }

    // Tìm duy nhất một bản ghi theo điều kiện
    async findOne(conditions) {
        try {
            const records = await this.findAll(conditions, [], 1);
            return records.length > 0 ? records[0] : null;
        } catch (error) {
            throw new Error(`Error in findOne ${this.tableName}: ${error.message}`);
        }
    }

    // Tìm kiếm nhanh bản ghi theo ID
    async findById(id) {
        return this.findOne({ id });
    }

    // Thêm mới một bản ghi vào bảng
    async create(data) {
        try {
            const columns = Object.keys(data);
            const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
            const values = Object.values(data);

            const query = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
            const result = await db.query(query, values);

            return result.rows[0];
        } catch (error) {
            throw new Error(`Error in create ${this.tableName}: ${error.message}`);
        }
    }

    // Cập nhật thông tin bản ghi theo ID
    async update(id, data) {
        try {
            const columns = Object.keys(data);
            const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
            const values = [...Object.values(data), id];

            const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${columns.length + 1}`;
            const result = await db.query(query, values);

            return result.rowCount > 0;
        } catch (error) {
            throw new Error(`Error in update ${this.tableName}: ${error.message}`);
        }
    }

    // Xóa bản ghi theo ID khỏi bảng
    async delete(id) {
        try {
            const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
            const result = await db.query(query, [id]);
            return result.rowCount > 0;
        } catch (error) {
            throw new Error(`Error in delete ${this.tableName}: ${error.message}`);
        }
    }

    // Đếm số lượng bản ghi thỏa mãn điều kiện lọc
    async count(conditions = {}) {
        try {
            let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
            const values = [];
            let paramIndex = 1;

            if (Object.keys(conditions).length > 0) {
                const whereConditions = Object.keys(conditions).map(key => {
                    values.push(conditions[key]);
                    return `${key} = $${paramIndex++}`;
                });
                query += ` WHERE ${whereConditions.join(' AND ')}`;
            }

            const result = await db.query(query, values);
            return parseInt(result.rows[0].count);
        } catch (error) {
            throw new Error(`Error in count ${this.tableName}: ${error.message}`);
        }
    }

    // Chạy câu lệnh SQL tùy chỉnh (custom query)
    async executeQuery(query, values = []) {
        try {
            const result = await db.query(query, values);
            return result.rows;
        } catch (error) {
            throw new Error(`Error in executeQuery ${this.tableName}: ${error.message}`);
        }
    }

    // Kiểm tra sự tồn tại của bản ghi thỏa mãn điều kiện lọc
    async exists(conditions) {
        const count = await this.count(conditions);
        return count > 0;
    }
}

module.exports = BaseDAO;
