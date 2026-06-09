const BaseDAO = require('./BaseDAO');

class InvoiceDAO extends BaseDAO {
    constructor() {
        super('invoices');
    }

    /**
     * Find invoices by room ID
     */
    async findByRoomId(roomId) {
        return this.findAll({ room_id: roomId }, ['billing_month DESC']);
    }

    /**
     * Find invoices by status
     */
    async findByStatus(status) {
        return this.findAll({ status }, ['due_date ASC']);
    }

    /**
     * Search and filter invoices
     */
    async searchAndFilter(filters = {}) {
        let query = `
            SELECT 
                i.*,
                r.room_number,
                r.building,
                r.floor,
                r.current_occupancy,
                (
                    SELECT STRING_AGG(DISTINCT u2.full_name, ', ')
                    FROM student_contracts sc2
                    LEFT JOIN users u2 ON sc2.user_id = u2.id
                    WHERE sc2.room_id = r.id AND sc2.status = 'Active'
                ) as student_names,
                (
                    SELECT STRING_AGG(DISTINCT u3.email, ', ')
                    FROM student_contracts sc3
                    LEFT JOIN users u3 ON sc3.user_id = u3.id
                    WHERE sc3.room_id = r.id AND sc3.status = 'Active'
                ) as student_emails
            FROM ${this.tableName} i
            LEFT JOIN rooms r ON i.room_id = r.id
            WHERE i.deleted_at IS NULL
        `;
        const values = [];
        let paramIndex = 1;

        if (filters.status) {
            query += ` AND i.status = $${paramIndex++}`;
            values.push(filters.status);
        }

        if (filters.roomId) {
            query += ` AND i.room_id = $${paramIndex++}`;
            values.push(filters.roomId);
        }

        if (filters.month) {
            query += ` AND i.billing_month = $${paramIndex++}`;
            values.push(filters.month);
        }

        if (filters.searchTerm) {
            query += ` AND (r.room_number ILIKE $${paramIndex} OR i.invoice_number ILIKE $${paramIndex + 1})`;
            values.push(`%${filters.searchTerm}%`, `%${filters.searchTerm}%`);
            paramIndex += 2;
        }

        // Sort: nếu lọc theo phòng thì sắp tăng dần theo tháng (cho chart), ngược lại mới nhất trước
        query += filters.roomId
            ? ` ORDER BY i.billing_month ASC`
            : ` ORDER BY i.created_at DESC`;

        if (filters.limit) {
            query += ` LIMIT $${paramIndex}`;
            values.push(filters.limit);
        }

        return this.executeQuery(query, values);
    }

    /**
     * Calculate and create invoice
     */
    async createInvoice(invoiceData) {
        // Calculate costs
        const electricUsage = invoiceData.electric_end - invoiceData.electric_start;
        const waterUsage = invoiceData.water_end - invoiceData.water_start;

        const electricAmount = electricUsage * invoiceData.electric_rate;
        const waterAmount = waterUsage * invoiceData.water_rate;

        // Service fees
        const serviceFees = (invoiceData.garbage_fee || 0) +
            (invoiceData.internet_fee || 0) +
            (invoiceData.parking_fee || 0);

        // Total
        const totalAmount = invoiceData.rent_amount +
            electricAmount +
            waterAmount +
            serviceFees -
            (invoiceData.discount_amount || 0) +
            (invoiceData.penalty_amount || 0);

        const invoice = {
            ...invoiceData,
            electric_amount: electricAmount,
            water_amount: waterAmount,
            service_fees: serviceFees,
            total_amount: totalAmount
        };

        return this.create(invoice);
    }

    /**
     * Mark invoice as paid
     */
    async markAsPaid(invoiceId, paymentMethod = 'Tiền mặt') {
        return this.update(invoiceId, {
            status: 'Đã thanh toán',
            paid_at: new Date(),
            payment_method: paymentMethod
        });
    }

    /**
     * Update overdue invoices
     * Only updates invoices where due_date is strictly before today
     */
    async updateOverdueInvoices() {
        const query = `
            UPDATE ${this.tableName} 
            SET status = 'Quá hạn', 
                updated_at = CURRENT_TIMESTAMP
            WHERE status = 'Chưa thanh toán' 
            AND due_date < CURRENT_DATE
            AND due_date IS NOT NULL
            AND deleted_at IS NULL
            RETURNING id, invoice_number, billing_month, due_date
        `;
        const result = await this.executeQuery(query);
        
        // Get total overdue count for logging
        const countQuery = `
            SELECT COUNT(*) as total
            FROM ${this.tableName}
            WHERE status = 'Quá hạn' AND deleted_at IS NULL
        `;
        const countResult = await this.executeQuery(countQuery);
        const totalOverdue = parseInt(countResult[0]?.total || 0);
        
        // Log updated invoices
        if (result.length > 0) {
            console.log(`[InvoiceDAO] ✅ Đã chuyển ${result.length} hoá đơn sang trạng thái quá hạn`);
            result.forEach(inv => {
                console.log(`  - ${inv.invoice_number} (${inv.billing_month}, hạn: ${inv.due_date})`);
            });
        }
        
        console.log(`[InvoiceDAO] 📊 Tổng số hoá đơn quá hạn hiện tại: ${totalOverdue}`);
        
        return result.length || 0;
    }

    /**
     * Get invoice statistics
     * - For current month: includes overdue from previous months
     * - For historical months: only data from that specific month
     * @param {string} billingMonth - Optional billing month in YYYY-MM-DD format
     */
    async getStatistics(billingMonth = null) {
        let currentBillingMonthStr;
        let isCurrentMonth = false;
        
        // Determine current billing month (Feb 2026)
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const lastMonth = month === 0 ? 11 : month - 1;
        const lastMonthYear = month === 0 ? year - 1 : year;
        const actualCurrentMonth = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}-01`;
        
        if (billingMonth) {
            currentBillingMonthStr = billingMonth;
            isCurrentMonth = (billingMonth === actualCurrentMonth);
            console.log(`[InvoiceDAO] Using provided billing month: ${currentBillingMonthStr} (current: ${isCurrentMonth})`);
        } else {
            currentBillingMonthStr = actualCurrentMonth;
            isCurrentMonth = true;
            console.log(`[InvoiceDAO] Using current billing month: ${currentBillingMonthStr}`);
        }

        let query;
        
        if (isCurrentMonth) {
            // Current month: include overdue from previous months
            query = `
                SELECT 
                    -- Total: current month + overdue from previous months
                    (
                        SELECT COUNT(DISTINCT id) 
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND (
                            billing_month = $1
                            OR (status = 'Quá hạn' AND billing_month < $1)
                        )
                    ) as total_invoices,

                    -- Paid: only from current month with status 'Đã thanh toán'
                    (
                        SELECT COUNT(*) 
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND billing_month = $1
                        AND status = 'Đã thanh toán'
                    ) as paid_count,

                    -- Unpaid: only from current month with status 'Chưa thanh toán'
                    (
                        SELECT COUNT(*) 
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND billing_month = $1
                        AND status = 'Chưa thanh toán'
                    ) as unpaid_count,

                    -- Overdue: all overdue from any month
                    (
                        SELECT COUNT(*) 
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND status = 'Quá hạn'
                    ) as overdue_count,

                    -- Total amount: current month + overdue from previous months
                    (
                        SELECT COALESCE(SUM(total_amount), 0)
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND (
                            billing_month = $1
                            OR (status = 'Quá hạn' AND billing_month < $1)
                        )
                    ) as total_amount,

                    -- Paid amount: only from current month
                    (
                        SELECT COALESCE(SUM(total_amount), 0)
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND billing_month = $1
                        AND status = 'Đã thanh toán'
                    ) as paid_amount,

                    -- Unpaid amount: only from current month
                    (
                        SELECT COALESCE(SUM(total_amount), 0)
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND billing_month = $1
                        AND status = 'Chưa thanh toán'
                    ) as unpaid_amount,

                    -- Overdue amount: all overdue from any month
                    (
                        SELECT COALESCE(SUM(total_amount), 0)
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND status = 'Quá hạn'
                    ) as overdue_amount,

                    -- Average amount: from current month only
                    (
                        SELECT COALESCE(ROUND(AVG(total_amount), 0), 0)
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND billing_month = $1
                    ) as average_amount,

                    -- Date range
                    (
                        SELECT TO_CHAR(MIN(billing_month), 'YYYY-MM')
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                    ) as earliest_month,

                    (
                        SELECT TO_CHAR(MAX(billing_month), 'YYYY-MM')
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                    ) as latest_month
            `;
        } else {
            // Historical month: only data from that specific month
            query = `
                SELECT 
                    -- Total: only from selected month
                    (
                        SELECT COUNT(*) 
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND billing_month = $1
                    ) as total_invoices,

                    -- Paid: from selected month
                    (
                        SELECT COUNT(*) 
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND billing_month = $1
                        AND status = 'Đã thanh toán'
                    ) as paid_count,

                    -- Unpaid: from selected month
                    (
                        SELECT COUNT(*) 
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND billing_month = $1
                        AND status = 'Chưa thanh toán'
                    ) as unpaid_count,

                    -- Overdue: from selected month
                    (
                        SELECT COUNT(*) 
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND billing_month = $1
                        AND status = 'Quá hạn'
                    ) as overdue_count,

                    -- Total amount: from selected month
                    (
                        SELECT COALESCE(SUM(total_amount), 0)
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND billing_month = $1
                    ) as total_amount,

                    -- Paid amount: from selected month
                    (
                        SELECT COALESCE(SUM(total_amount), 0)
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND billing_month = $1
                        AND status = 'Đã thanh toán'
                    ) as paid_amount,

                    -- Unpaid amount: from selected month
                    (
                        SELECT COALESCE(SUM(total_amount), 0)
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND billing_month = $1
                        AND status = 'Chưa thanh toán'
                    ) as unpaid_amount,

                    -- Overdue amount: from selected month
                    (
                        SELECT COALESCE(SUM(total_amount), 0)
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND billing_month = $1
                        AND status = 'Quá hạn'
                    ) as overdue_amount,

                    -- Average amount: from selected month
                    (
                        SELECT COALESCE(ROUND(AVG(total_amount), 0), 0)
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                        AND billing_month = $1
                    ) as average_amount,

                    -- Date range
                    (
                        SELECT TO_CHAR(MIN(billing_month), 'YYYY-MM')
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                    ) as earliest_month,

                    (
                        SELECT TO_CHAR(MAX(billing_month), 'YYYY-MM')
                        FROM ${this.tableName}
                        WHERE deleted_at IS NULL
                    ) as latest_month
            `;
        }
        
        const result = await this.executeQuery(query, [currentBillingMonthStr]);
        return result[0] || {};
    }


    /**
     * Get revenue statistics (deprecated - use getStatistics instead)
     */
    async getRevenueStatistics(startDate, endDate) {
        const query = `
            SELECT 
                TO_CHAR(billing_month, 'YYYY-MM') as month,
                COUNT(*) as total_invoices,
                SUM(total_amount) as total_amount,
                SUM(CASE WHEN status = 'Đã thanh toán' THEN total_amount ELSE 0 END) as paid_amount,
                SUM(CASE WHEN status = 'Chưa thanh toán' THEN total_amount ELSE 0 END) as unpaid_amount,
                SUM(CASE WHEN status = 'Quá hạn' THEN total_amount ELSE 0 END) as overdue_amount
            FROM ${this.tableName}
            WHERE billing_month BETWEEN $1 AND $2
            GROUP BY month
            ORDER BY month DESC
        `;
        return this.executeQuery(query, [startDate, endDate]);
    }

    /**
     * Get unpaid invoices for a user (by room)
     */
    async getUnpaidByUser(userId) {
        const query = `
            SELECT i.*, r.room_number, r.building
            FROM ${this.tableName} i
            INNER JOIN rooms r ON i.room_id = r.id
            INNER JOIN student_contracts sc ON r.id = sc.room_id
            WHERE sc.user_id = $1
            AND sc.status = 'Active'
            AND i.status IN ('Chưa thanh toán', 'Quá hạn')
            ORDER BY i.due_date ASC
        `;
        return this.executeQuery(query, [userId]);
    }

    /**
     * Get invoices by room
     */
    async getByRoom(roomId, limit = null) {
        const query = `
            SELECT i.*
            FROM ${this.tableName} i
            WHERE i.room_id = $1
            ORDER BY i.billing_month DESC
            ${limit ? 'LIMIT $2' : ''}
        `;
        return this.executeQuery(query, limit ? [roomId, limit] : [roomId]);
    }

    /**
     * Check if invoice exists for room and billing month
     */
    async existsForRoomAndMonth(roomId, billingMonth) {
        const query = `
            SELECT COUNT(*) as count
            FROM ${this.tableName}
            WHERE room_id = $1 AND billing_month = $2
        `;
        const result = await this.executeQuery(query, [roomId, billingMonth]);
        const count = parseInt(result[0]?.count || 0);
        return count > 0;
    }

    /**
     * Delete invoice by ID (soft delete)
     */
    async delete(id) {
        const query = `
            UPDATE ${this.tableName} 
            SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING *
        `;
        const result = await this.executeQuery(query, [id]);
        return result[0];
    }

    /**
     * Get pricing settings from settings table
     */
    async getPricingSettings() {
        const query = `
            SELECT * FROM settings 
            WHERE category = 'pricing' AND name = 'pricing_config' AND is_active = true
            LIMIT 1
        `;
        const result = await this.executeQuery(query);
        return result[0] || null;
    }

    /**
     * Create pricing settings in settings table
     */
    async createPricingSettings(settingData) {
        const query = `
            INSERT INTO settings (id, category, name, value, description, is_active, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const result = await this.executeQuery(query, [
            settingData.id,
            settingData.category,
            settingData.name,
            JSON.stringify(settingData.value),
            settingData.description,
            settingData.is_active
        ]);
        return result[0];
    }

    /**
     * Update pricing settings in settings table
     */
    async updatePricingSettings(value, updatedBy = null) {
        const query = `
            UPDATE settings 
            SET value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = 'pricing_config'
            RETURNING *
        `;
        const result = await this.executeQuery(query, [JSON.stringify(value), updatedBy]);
        return result[0];
    }

    /**
     * Lấy dữ liệu điện/nước của tất cả phòng trong N tháng gần nhất
     * để phát hiện bất thường so với trung bình 3 tháng trước
     */
    async getAnomalyData(monthsBack = 4) {
        // Lấy tất cả hóa đơn trong 4 tháng gần nhất (3 tháng baseline + tháng hiện tại)
        const query = `
            SELECT
                i.id,
                i.invoice_number,
                i.room_id,
                r.room_number,
                r.building,
                i.billing_month,
                i.electric_start,
                i.electric_end,
                COALESCE(i.electric_end - i.electric_start, 0) AS electric_usage,
                i.water_start,
                i.water_end,
                COALESCE(i.water_end - i.water_start, 0) AS water_usage,
                i.electric_amount,
                i.water_amount,
                i.total_amount,
                i.status,
                i.occupancy
            FROM invoices i
            JOIN rooms r ON r.id = i.room_id
            WHERE i.deleted_at IS NULL
              AND i.billing_month >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '${monthsBack} months'
            ORDER BY i.room_id, i.billing_month DESC
        `;
        return this.executeQuery(query, []);
    }
}

module.exports = new InvoiceDAO();
