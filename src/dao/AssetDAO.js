const pool = require('../config/database');

class AssetDAO {
    /**
     * Get all assets with optional filters
     */
    async findAll(filters = {}) {
        try {
            let query = `
                SELECT 
                    id, asset_code, name, category_name, unit,
                    room_id, location, quantity, status,
                    purchase_date, purchase_price, supplier,
                    specifications, qr_code, description, note,
                    created_by, created_at, updated_at
                FROM assets
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 1;

            if (filters.search) {
                query += ` AND (name ILIKE $${paramCount} OR asset_code ILIKE $${paramCount})`;
                params.push(`%${filters.search}%`);
                paramCount++;
            }

            if (filters.category) {
                query += ` AND category_name = $${paramCount}`;
                params.push(filters.category);
                paramCount++;
            }

            if (filters.status) {
                query += ` AND status = $${paramCount}`;
                params.push(filters.status);
                paramCount++;
            }

            if (filters.room_id) {
                query += ` AND room_id = $${paramCount}`;
                params.push(filters.room_id);
                paramCount++;
            }

            query += ` ORDER BY asset_code, created_at DESC`;

            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get asset summary grouped by asset_code
     */
    async getAssetSummary() {
        try {
            const query = `
                SELECT 
                    asset_code,
                    name,
                    category_name,
                    unit,
                    purchase_date,
                    purchase_price,
                    SUM(quantity) as total_quantity,
                    SUM(CASE WHEN status = 'Đang sử dụng' THEN quantity ELSE 0 END) as in_use,
                    SUM(CASE WHEN status = 'Sẵn sàng' THEN quantity ELSE 0 END) as in_stock,
                    SUM(CASE WHEN status IN ('Hư hỏng', 'Đang bảo trì') THEN quantity ELSE 0 END) as damaged
                FROM assets
                GROUP BY asset_code, name, category_name, unit, purchase_date, purchase_price
                ORDER BY asset_code
            `;

            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get asset by ID
     */
    async findById(id) {
        try {
            const query = `
                SELECT 
                    id, asset_code, name, category_name, unit,
                    room_id, location, quantity, status,
                    purchase_date, purchase_price, supplier,
                    specifications, qr_code, description, note,
                    created_by, created_at, updated_at
                FROM assets
                WHERE id = $1
            `;

            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Create new asset
     */
    async create(assetData) {
        try {
            const query = `
                INSERT INTO assets (
                    id, asset_code, name, category_name, unit,
                    room_id, location, quantity, status,
                    purchase_date, purchase_price, supplier,
                    specifications, qr_code, description, note,
                    created_by, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
                )
                RETURNING *
            `;

            const values = [
                assetData.id,
                assetData.asset_code,
                assetData.name,
                assetData.category_name,
                assetData.unit,
                assetData.room_id || null,
                assetData.location,
                assetData.quantity,
                assetData.status,
                assetData.purchase_date,
                assetData.purchase_price,
                assetData.supplier,
                assetData.specifications ? JSON.stringify(assetData.specifications) : null,
                assetData.qr_code,
                assetData.description,
                assetData.note,
                assetData.created_by
            ];

            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update asset
     */
    async update(id, assetData) {
        try {
            const query = `
                UPDATE assets
                SET 
                    asset_code = $2,
                    name = $3,
                    category_name = $4,
                    unit = $5,
                    room_id = $6,
                    location = $7,
                    quantity = $8,
                    status = $9,
                    purchase_date = $10,
                    purchase_price = $11,
                    supplier = $12,
                    specifications = $13,
                    qr_code = $14,
                    description = $15,
                    note = $16,
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
            `;

            const values = [
                id,
                assetData.asset_code,
                assetData.name,
                assetData.category_name,
                assetData.unit,
                assetData.room_id || null,
                assetData.location,
                assetData.quantity,
                assetData.status,
                assetData.purchase_date,
                assetData.purchase_price,
                assetData.supplier,
                assetData.specifications ? JSON.stringify(assetData.specifications) : null,
                assetData.qr_code,
                assetData.description,
                assetData.note
            ];

            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Delete asset
     */
    async delete(id) {
        try {
            const query = 'DELETE FROM assets WHERE id = $1 RETURNING *';
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get asset distribution by building
     */
    async getAssetsByBuilding() {
        try {
            const query = `
                SELECT 
                    CASE 
                        WHEN r.building IS NOT NULL THEN r.building
                        WHEN a.location LIKE '%Tòa A%' OR a.location LIKE '%A-%' THEN 'A'
                        WHEN a.location LIKE '%Tòa B%' OR a.location LIKE '%B-%' THEN 'B'
                        WHEN a.location LIKE '%Tòa C%' OR a.location LIKE '%C-%' THEN 'C'
                        WHEN a.location LIKE '%Tòa D%' OR a.location LIKE '%D-%' THEN 'D'
                        ELSE 'Kho'
                    END as building,
                    COUNT(*) as asset_count,
                    SUM(a.quantity) as total_quantity,
                    SUM(CASE WHEN a.status = 'Đang sử dụng' THEN a.quantity ELSE 0 END) as in_use,
                    SUM(CASE WHEN a.status = 'Sẵn sàng' THEN a.quantity ELSE 0 END) as in_stock,
                    SUM(CASE WHEN a.status IN ('Hư hỏng', 'Đang bảo trì') THEN a.quantity ELSE 0 END) as damaged,
                    SUM(a.purchase_price * a.quantity) as total_value
                FROM assets a
                LEFT JOIN rooms r ON a.room_id = r.id
                GROUP BY 
                    CASE 
                        WHEN r.building IS NOT NULL THEN r.building
                        WHEN a.location LIKE '%Tòa A%' OR a.location LIKE '%A-%' THEN 'A'
                        WHEN a.location LIKE '%Tòa B%' OR a.location LIKE '%B-%' THEN 'B'
                        WHEN a.location LIKE '%Tòa C%' OR a.location LIKE '%C-%' THEN 'C'
                        WHEN a.location LIKE '%Tòa D%' OR a.location LIKE '%D-%' THEN 'D'
                        ELSE 'Kho'
                    END
                ORDER BY building
            `;

            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get asset statistics
     */
    async getStatistics() {
        try {
            const query = `
                SELECT 
                    COUNT(DISTINCT asset_code) as total_types,
                    SUM(quantity) as total_quantity,
                    SUM(CASE WHEN status = 'Đang sử dụng' THEN quantity ELSE 0 END) as in_use,
                    SUM(CASE WHEN status = 'Sẵn sàng' THEN quantity ELSE 0 END) as available,
                    SUM(CASE WHEN status IN ('Hư hỏng', 'Đang bảo trì') THEN quantity ELSE 0 END) as damaged,
                    SUM(purchase_price * quantity) as total_value
                FROM assets
            `;

            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new AssetDAO();
