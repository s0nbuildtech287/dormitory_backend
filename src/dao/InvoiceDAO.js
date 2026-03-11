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
        
        // Log updated invoices for debugging
        if (result.length > 0) {
            console.log(`[InvoiceDAO] Updated ${result.length} overdue invoices:`);
            result.forEach(inv => {
                console.log(`  - ${inv.invoice_number} (${inv.billing_month}, due: ${inv.due_date})`);
            });
        }
        
        return result.length || 0;
    }

    /**
     * Get invoice statistics
     * - Total: All invoices from current billing month + all overdue from any month
     * - Paid: Only paid invoices from current billing month
     * - Unpaid: Only unpaid invoices from current billing month
     * - Overdue: All overdue invoices from any month
     */
    async getStatistics() {
        // Get current billing month (last month)
        const now = new Date();
        const currentBillingMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const currentBillingMonthStr = currentBillingMonth.toISOString().split('T')[0].substring(0, 7) + '-01';

        const query = `
            WITH current_month_invoices AS (
                -- All invoices from current billing month
                SELECT *
                FROM ${this.tableName}
                WHERE deleted_at IS NULL
                AND billing_month = $1
            ),
            all_overdue_invoices AS (
                -- All overdue invoices from any month
                SELECT *
                FROM ${this.tableName}
                WHERE deleted_at IS NULL
                AND status = 'Quá hạn'
            ),
            combined_invoices AS (
                -- Combine current month + overdue from previous months (avoid duplicates)
                SELECT * FROM current_month_invoices
                UNION
                SELECT * FROM all_overdue_invoices WHERE billing_month < $1
            )
            SELECT 
                -- Total: current month + overdue from previous months
                COUNT(*) as total_invoices,
                
                -- Paid: only from current month
                (SELECT COUNT(*) FROM current_month_invoices WHERE status = 'Đã thanh toán') as paid_count,
                
                -- Unpaid: only from current month
                (SELECT COUNT(*) FROM current_month_invoices WHERE status = 'Chưa thanh toán') as unpaid_count,
                
                -- Overdue: all overdue from any month
                (SELECT COUNT(*) FROM all_overdue_invoices) as overdue_count,
                
                -- Amount totals from combined set
                COALESCE(SUM(total_amount), 0) as total_amount,
                
                -- Paid amount: only from current month
                (SELECT COALESCE(SUM(total_amount), 0) FROM current_month_invoices WHERE status = 'Đã thanh toán') as paid_amount,
                
                -- Unpaid amount: only from current month
                (SELECT COALESCE(SUM(total_amount), 0) FROM current_month_invoices WHERE status = 'Chưa thanh toán') as unpaid_amount,
                
                -- Overdue amount: all overdue from any month
                (SELECT COALESCE(SUM(total_amount), 0) FROM all_overdue_invoices) as overdue_amount,
                
                -- Average and date range
                COALESCE(ROUND(AVG(total_amount), 0), 0) as average_amount,
                TO_CHAR(MIN(billing_month), 'YYYY-MM') as earliest_month,
                TO_CHAR(MAX(billing_month), 'YYYY-MM') as latest_month
            FROM combined_invoices
        `;
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
}

module.exports = new InvoiceDAO();
