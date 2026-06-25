const pool = require('../config/database');

class AssetDAO {
    // Lấy danh sách toàn bộ tài sản theo các bộ lọc
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

    // Lấy bảng tổng hợp tài sản nhóm theo mã tài sản (asset_code)
    async getAssetSummary() {
        try {
            const query = `
                SELECT 
                    asset_code,
                    MAX(name) as name,
                    MAX(category_name) as category_name,
                    MAX(unit) as unit,
                    MAX(purchase_date) as purchase_date,
                    -- Tính toán đơn giá trung bình mỗi đơn vị tài sản
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

    // Tìm kiếm tài sản theo ID
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

    // Thêm mới tài sản
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

    // Cập nhật thông tin tài sản
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

    // Xóa tài sản theo ID
    async delete(id) {
        try {
            const query = 'DELETE FROM assets WHERE id = $1 RETURNING *';
            const result = await pool.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    // Thống kê tài sản phân bổ theo tòa nhà
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

    // Lấy số liệu thống kê chung về tài sản (tổng loại, tổng số lượng, giá trị...)
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

    // Nhập kho tài sản mới (tự động cộng dồn số lượng nếu trùng mã và vị trí kho)
    async importAsset(importData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Kiểm tra xem tài sản cùng mã đã tồn tại ở kho chưa
            const checkQuery = `
                SELECT id, quantity FROM assets 
                WHERE asset_code = $1 AND room_id IS NULL AND status = 'Sẵn sàng'
                LIMIT 1
            `;
            const existingAsset = await client.query(checkQuery, [importData.asset_code]);

            let result;
            if (existingAsset.rows.length > 0) {
                // Cộng dồn số lượng tài sản hiện tại trong kho
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
                // Tạo mới dòng tài sản trong kho
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

            // Ghi nhật ký hệ thống log_system
            const logQuery = `
                INSERT INTO log_system (
                    id, user_id, action, entity_type, entity_id,
                    old_value, new_value, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `;
            await client.query(logQuery, [
                `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                importData.created_by,
                'IMPORT_ASSET',
                'assets',
                result.rows[0].id,
                existingAsset.rows.length > 0 ? JSON.stringify({ quantity: existingAsset.rows[0].quantity }) : null,
                JSON.stringify({
                    asset_code: importData.asset_code,
                    asset_name: importData.asset_name,
                    unit: importData.unit,
                    quantity: result.rows[0].quantity,
                    import_quantity: importData.quantity,
                    purchase_price: importData.purchase_price,
                    total_price: importData.total_price,
                    supplier: importData.supplier,
                    invoice_number: importData.invoice_number,
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

    // Lấy danh sách tài sản của phòng được chọn
    async findByRoom(roomId) {
        try {
            const query = `
                SELECT 
                    asset_code,
                    MAX(name) as asset_name,
                    MAX(unit) as unit,
                    SUM(quantity) as quantity
                FROM assets
                WHERE room_id = $1
                GROUP BY asset_code
                ORDER BY asset_code
            `;

            const result = await pool.query(query, [roomId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    // Xuất kho tài sản chuyển giao đến phòng (kiểm tra giới hạn số lượng mỗi phòng trước khi xuất)
    async exportAsset(exportData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Kiểm tra số lượng tài sản sẵn sàng trong kho
            const checkQuery = `
                SELECT id, quantity FROM assets 
                WHERE asset_code = $1 AND room_id IS NULL AND status = 'Sẵn sàng'
                LIMIT 1
            `;
            const warehouseAsset = await client.query(checkQuery, [exportData.asset_code]);

            if (warehouseAsset.rows.length === 0) {
                throw new Error('Không tìm thấy tài sản trong kho');
            }

            const availableQty = warehouseAsset.rows[0].quantity;
            if (availableQty < exportData.quantity) {
                throw new Error(`Không đủ số lượng trong kho. Tồn kho: ${availableQty} ${exportData.unit}`);
            }

            // Kiểm tra giới hạn số lượng tài sản tối đa được phép xếp vào phòng từ settings
            const limits = await this.getAssetLimits();
            
            // Đếm số lượng tài sản cùng loại đang có ở phòng
            const currentCountQuery = `
                SELECT COALESCE(SUM(quantity), 0) as current_count
                FROM assets
                WHERE room_id = $1 AND asset_code = $2
            `;
            const currentCount = await client.query(currentCountQuery, [exportData.room_id, exportData.asset_code]);
            const currentQty = parseInt(currentCount.rows[0].current_count) || 0;
            const newTotalQty = currentQty + exportData.quantity;

            // Ánh xạ mã tài sản tương ứng trong settings
            const assetCodeToLimitKey = {
                'GIUONG': 'GIUONG',
                'TU': 'TU',
                'BAN': 'BAN',
                'QUAT': 'QUAT',
                'DIEUHOA': 'DIEUHOA',
                'DEN': 'DEN'
            };

            const limitKey = assetCodeToLimitKey[exportData.asset_code];
            if (limitKey && limits.perRoom && limits.perRoom[limitKey]) {
                const maxAllowed = limits.perRoom[limitKey];
                if (newTotalQty > maxAllowed) {
                    throw new Error(`Vượt quá giới hạn! Phòng chỉ được phép tối đa ${maxAllowed} ${exportData.asset_name}. Hiện tại: ${currentQty}, muốn thêm: ${exportData.quantity}`);
                }
            }

            // Giảm số lượng tài sản trong kho
            if (availableQty === exportData.quantity) {
                // Xóa khỏi kho nếu số lượng giảm về 0
                await client.query('DELETE FROM assets WHERE id = $1', [warehouseAsset.rows[0].id]);
            } else {
                // Giảm bớt số lượng
                await client.query(
                    'UPDATE assets SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
                    [exportData.quantity, warehouseAsset.rows[0].id]
                );
            }

            // Kiểm tra xem tài sản này đã có dòng dữ liệu nào trong phòng đích chưa
            const roomAssetQuery = `
                SELECT id, quantity FROM assets 
                WHERE asset_code = $1 AND room_id = $2
                LIMIT 1
            `;
            const roomAsset = await client.query(roomAssetQuery, [exportData.asset_code, exportData.room_id]);

            let result;
            if (roomAsset.rows.length > 0) {
                // Cộng dồn vào dòng tài sản đã có trong phòng
                const updateQuery = `
                    UPDATE assets
                    SET 
                        quantity = quantity + $1,
                        status = 'Đang sử dụng',
                        updated_at = NOW()
                    WHERE id = $2
                    RETURNING *
                `;
                result = await client.query(updateQuery, [exportData.quantity, roomAsset.rows[0].id]);
            } else {
                // Tạo mới dòng tài sản trong phòng
                const insertQuery = `
                    INSERT INTO assets (
                        id, asset_code, name, category_name, unit,
                        room_id, location, quantity, status,
                        purchase_date, purchase_price, supplier,
                        description, note, created_by, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, 'Đang sử dụng', $9, $10, $11, $12, $13, $14, NOW(), NOW()
                    )
                    RETURNING *
                `;
                result = await client.query(insertQuery, [
                    exportData.id,
                    exportData.asset_code,
                    exportData.asset_name,
                    exportData.category_name || 'Khác',
                    exportData.unit,
                    exportData.room_id,
                    `Tòa ${exportData.building} - ${exportData.room_number}`,
                    exportData.quantity,
                    exportData.export_date,
                    0, // Giá mua khi xuất là 0 (đã hạch toán ở kho)
                    'Kho nội bộ',
                    `Xuất kho đến ${exportData.building}-${exportData.room_number}`,
                    exportData.notes,
                    exportData.created_by
                ]);
            }

            // Ghi nhật ký hệ thống log_system
            const logQuery = `
                INSERT INTO log_system (
                    id, user_id, action, entity_type, entity_id,
                    old_value, new_value, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `;
            await client.query(logQuery, [
                `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                exportData.created_by,
                'EXPORT_ASSET',
                'assets',
                result.rows[0].id,
                JSON.stringify({ warehouse_quantity: availableQty }),
                JSON.stringify({
                    asset_code: exportData.asset_code,
                    asset_name: exportData.asset_name,
                    unit: exportData.unit,
                    export_quantity: exportData.quantity,
                    building: exportData.building,
                    room_id: exportData.room_id,
                    room_number: exportData.room_number,
                    purpose: exportData.purpose,
                    notes: exportData.notes
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

    // Lấy lịch sử nhập/xuất kho tài sản từ nhật ký hệ thống log_system
    async getHistory(filters = {}) {
        try {
            let query = `
                SELECT 
                    l.id, l.user_id, l.action, l.entity_id,
                    l.old_value, l.new_value, l.created_at,
                    u.full_name as created_by_name,
                    a.asset_code, a.name as asset_name, a.unit, a.purchase_price
                FROM log_system l
                LEFT JOIN users u ON l.user_id = u.id
                LEFT JOIN assets a ON l.entity_id = a.id
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

    // Lấy thông tin giới hạn số lượng tài sản tối đa của phòng/tầng từ settings
    async getAssetLimits() {
        try {
            const query = 'SELECT value FROM settings WHERE id = $1 AND is_active = TRUE';
            const result = await pool.query(query, ['asset_limits']);
            
            if (result.rows.length === 0) {
                // Giá trị mặc định nếu chưa cấu hình
                return {
                    perRoom: {
                        GIUONG: 5,
                        TU: 5,
                        BAN: 5,
                        QUAT: 2,
                        DIEUHOA: 1,
                        DEN: 5
                    },
                    perFloor: {
                        WIFI: 1,
                        CAMERA: 1
                    }
                };
            }
            
            return result.rows[0].value;
        } catch (error) {
            throw error;
        }
    }

    // Cập nhật giới hạn số lượng tài sản tối đa trong settings
    async updateAssetLimits(limits, updatedBy) {
        try {
            const query = `
                INSERT INTO settings (id, category, name, value, description, is_active, updated_by, updated_at)
                VALUES ($1, $2, $3, $4, $5, TRUE, $6, CURRENT_TIMESTAMP)
                ON CONFLICT (id) 
                DO UPDATE SET 
                     value = $4,
                     updated_by = $6,
                     updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            
            const values = [
                'asset_limits',
                'asset',
                'Giới hạn tài sản',
                JSON.stringify(limits),
                'Giới hạn số lượng tài sản tối đa cho mỗi phòng và mỗi tầng',
                updatedBy
            ];

            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    // Lấy các điều lệ quy định về bảo quản sử dụng tài sản
    async getAssetRegulations() {
        try {
            const query = 'SELECT value FROM settings WHERE id = $1 AND is_active = TRUE';
            const result = await pool.query(query, ['asset_regulations']);
            
            if (result.rows.length === 0) {
                return [];
            }
            
            return result.rows[0].value;
        } catch (error) {
            throw error;
        }
    }

    // Cập nhật các điều lệ quy định sử dụng tài sản
    async updateAssetRegulations(regulations, updatedBy) {
        try {
            const query = `
                INSERT INTO settings (id, category, name, value, description, is_active, updated_by, updated_at)
                VALUES ($1, $2, $3, $4, $5, TRUE, $6, CURRENT_TIMESTAMP)
                ON CONFLICT (id) 
                DO UPDATE SET 
                    value = $4,
                    updated_by = $6,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            
            const values = [
                'asset_regulations',
                'asset',
                'Điều lệ tài sản',
                JSON.stringify(regulations),
                'Quy định về bảo quản, sử dụng và bồi thường tài sản trong ký túc xá',
                updatedBy
            ];

            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new AssetDAO();
