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
            WHERE 1=1
        `;
        const values = [];
        let paramIndex = 1;

        if (filters.status) {
            query += ` AND i.status = $${paramIndex++}`;
            values.push(filters.status);
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

        query += ` ORDER BY i.created_at DESC`;

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
        `;
        const result = await this.executeQuery(query);
        return result.rowCount || 0;
    }

    /**
     * Get revenue statistics
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
}

module.exports = new InvoiceDAO();
