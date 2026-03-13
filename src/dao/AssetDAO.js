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
                    MAX(name) as name,
                    MAX(category_name) as category_name,
                    MAX(unit) as unit,
                    MAX(purchase_date) as purchase_date,
                    -- Calculate average price per unit
                    ROUND(
                        SUM(purchase_price * quantity) / NULLIF(SUM(quantity), 0), 
                        2
                    ) as purchase_price,
                    MAX(supplier) as supplier,
                    (SELECT specifications FROM assets a2 WHERE a2.asset_code = assets.asset_code LIMIT 1) as specifications,
                    SUM(quantity) as total_quantity,
                    SUM(CASE WHEN status = 'Đang sử dụng' THEN quantity ELSE 0 END) as in_use,
                    SUM(CASE WHEN status = 'Sẵn sàng' THEN quantity ELSE 0 END) as in_stock,
                    SUM(CASE WHEN status IN ('Hư hỏng', 'Đang bảo trì') THEN quantity ELSE 0 END) as damaged
                FROM assets
                GROUP BY asset_code
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

    /**
     * Import asset to warehouse (Nhập kho)
     */
    async importAsset(importData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check if asset with same code exists
            const checkQuery = `
                SELECT id, quantity FROM assets 
                WHERE asset_code = $1 AND room_id IS NULL AND status = 'Sẵn sàng'
                LIMIT 1
            `;
            const existingAsset = await client.query(checkQuery, [importData.asset_code]);

            let result;
            if (existingAsset.rows.length > 0) {
                // Update existing asset quantity
                const updateQuery = `
                    UPDATE assets
                    SET 
                        quantity = quantity + $1,
                        purchase_date = $2,
                        purchase_price = $3,
                        supplier = $4,
                        note = $5,
                        updated_at = NOW()
                    WHERE id = $6
                    RETURNING *
                `;
                result = await client.query(updateQuery, [
                    importData.quantity,
                    importData.import_date,
                    importData.purchase_price,
                    importData.supplier,
                    importData.notes,
                    existingAsset.rows[0].id
                ]);
            } else {
                // Create new asset in warehouse
                const insertQuery = `
                    INSERT INTO assets (
                        id, asset_code, name, category_name, unit,
                        room_id, location, quantity, status,
                        purchase_date, purchase_price, supplier,
                        description, note, created_by, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, NULL, 'Kho', $6, 'Sẵn sàng', $7, $8, $9, $10, $11, $12, NOW(), NOW()
                    )
                    RETURNING *
                `;
                result = await client.query(insertQuery, [
                    importData.id,
                    importData.asset_code,
                    importData.asset_name,
                    importData.category_name || 'Khác',
                    importData.unit,
                    importData.quantity,
                    importData.import_date,
                    importData.purchase_price,
                    importData.supplier,
                    `Nhập kho - Hóa đơn: ${importData.invoice_number || 'N/A'}`,
                    importData.notes,
                    importData.created_by
                ]);
            }

            // Create log entry
            const logQuery = `
                INSERT INTO log_system (
                    id, user_id, action, entity_type, entity_id,
                    old_value, new_value, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `;
            await client.query(logQuery, [
                `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                importData.created_by,
                'IMPORT_ASSET',
                'assets',
                result.rows[0].id,
                existingAsset.rows.length > 0 ? JSON.stringify({ quantity: existingAsset.rows[0].quantity }) : null,
                JSON.stringify({
                    quantity: result.rows[0].quantity,
                    import_quantity: importData.quantity,
                    supplier: importData.supplier,
                    invoice_number: importData.invoice_number,
                    total_price: importData.total_price,
                    notes: importData.notes
                })
            ]);

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get import/export history from log_system
     */
    async getHistory(filters = {}) {
        try {
            let query = `
                SELECT 
                    l.id, l.user_id, l.action, l.entity_id,
                    l.old_value, l.new_value, l.created_at,
                    u.full_name as created_by_name
                FROM log_system l
                LEFT JOIN users u ON l.user_id = u.id
                WHERE l.entity_type = 'assets' 
                AND l.action IN ('IMPORT_ASSET', 'EXPORT_ASSET')
            `;
            const params = [];
            let paramCount = 1;

            if (filters.type) {
                if (filters.type === 'import') {
                    query += ` AND l.action = 'IMPORT_ASSET'`;
                } else if (filters.type === 'export') {
                    query += ` AND l.action = 'EXPORT_ASSET'`;
                }
            }

            if (filters.date_from) {
                query += ` AND l.created_at >= $${paramCount}`;
                params.push(filters.date_from);
                paramCount++;
            }

            if (filters.date_to) {
                query += ` AND l.created_at <= $${paramCount}`;
                params.push(filters.date_to);
                paramCount++;
            }

            query += ` ORDER BY l.created_at DESC`;

            if (filters.limit) {
                query += ` LIMIT $${paramCount}`;
                params.push(filters.limit);
            }

            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new AssetDAO();
