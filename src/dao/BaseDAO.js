const db = require('../config/database');

/**
 * Base DAO Class - Provides generic CRUD operations
 * All specific DAO classes will extend this base class
 * Flexible design allows easy column additions/modifications
 */
class BaseDAO {
    constructor(tableName) {
        this.tableName = tableName;
    }

    /**
     * Get all records with optional conditions
     * @param {Object} conditions - WHERE conditions
     * @param {Array} orderBy - ORDER BY columns ['column DESC', 'column2 ASC']
     * @param {Number} limit - LIMIT value
     * @param {Number} offset - OFFSET value
     */
    async findAll(conditions = {}, orderBy = [], limit = null, offset = null) {
        try {
            let query = `SELECT * FROM ${this.tableName}`;
            const values = [];
            let paramIndex = 1;

            // WHERE clause
            if (Object.keys(conditions).length > 0) {
                const whereConditions = Object.keys(conditions).map(key => {
                    values.push(conditions[key]);
                    return `${key} = $${paramIndex++}`;
                });
                query += ` WHERE ${whereConditions.join(' AND ')}`;
            }

            // ORDER BY clause
            if (orderBy.length > 0) {
                query += ` ORDER BY ${orderBy.join(', ')}`;
            }

            // LIMIT and OFFSET
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

    /**
     * Find one record by conditions
     */
    async findOne(conditions) {
        try {
            const records = await this.findAll(conditions, [], 1);
            return records.length > 0 ? records[0] : null;
        } catch (error) {
            throw new Error(`Error in findOne ${this.tableName}: ${error.message}`);
        }
    }

    /**
     * Find record by ID
     */
    async findById(id) {
        return this.findOne({ id });
    }

    /**
     * Create new record
     * @param {Object} data - Data to insert
     */
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

    /**
     * Update record by ID
     * @param {String} id - Record ID
     * @param {Object} data - Data to update
     */
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

    /**
     * Delete record by ID
     */
    async delete(id) {
        try {
            const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
            const result = await db.query(query, [id]);
            return result.rowCount > 0;
        } catch (error) {
            throw new Error(`Error in delete ${this.tableName}: ${error.message}`);
        }
    }

    /**
     * Count records with optional conditions
     */
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

    /**
     * Execute custom query
     */
    async executeQuery(query, values = []) {
        try {
            const result = await db.query(query, values);
            return result.rows;
        } catch (error) {
            throw new Error(`Error in executeQuery ${this.tableName}: ${error.message}`);
        }
    }

    /**
     * Check if record exists
     */
    async exists(conditions) {
        const count = await this.count(conditions);
        return count > 0;
    }
}

module.exports = BaseDAO;
