const BaseDAO = require('./BaseDAO');

class InvoiceDAO extends BaseDAO {
    constructor() {
        super('invoices');
    }

    /**
     * Find invoices by contract ID
     */
    async findByContractId(contractId) {
        return this.findAll({ contract_id: contractId }, ['billing_month DESC']);
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
                u.full_name as student_name,
                u.email as student_email,
                r.room_number,
                r.building,
                sc.user_id
            FROM ${this.tableName} i
            LEFT JOIN student_contracts sc ON i.contract_id = sc.id
            LEFT JOIN users u ON sc.user_id = u.id
            LEFT JOIN rooms r ON sc.room_id = r.id
            WHERE 1=1
        `;
        const values = [];

        if (filters.status) {
            query += ` AND i.status = ?`;
            values.push(filters.status);
        }

        if (filters.month) {
            query += ` AND i.billing_month = ?`;
            values.push(filters.month);
        }

        if (filters.searchTerm) {
            query += ` AND (u.full_name LIKE ? OR i.invoice_number LIKE ?)`;
            values.push(`%${filters.searchTerm}%`, `%${filters.searchTerm}%`);
        }

        query += ` ORDER BY i.created_at DESC`;

        if (filters.limit) {
            query += ` LIMIT ?`;
            values.push(filters.limit);
        }

        return this.executeQuery(query, values);
    }

    /**
     * Calculate and create invoice
     */
    async createInvoice(invoiceData) {
        // Calculate total
        const electricUsage = invoiceData.electric_end - invoiceData.electric_start;
        const waterUsage = invoiceData.water_end - invoiceData.water_start;
        
        const electricCost = electricUsage * invoiceData.electric_rate;
        const waterCost = waterUsage * invoiceData.water_rate;
        const totalAmount = invoiceData.rent_amount + electricCost + waterCost + (invoiceData.other_fees || 0);

        const invoice = {
            ...invoiceData,
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
     */
    async updateOverdueInvoices() {
        const query = `
            UPDATE ${this.tableName} 
            SET status = 'Quá hạn' 
            WHERE status = 'Chưa thanh toán' 
            AND due_date < CURDATE()
        `;
        const [result] = await this.executeQuery(query);
        return result.affectedRows;
    }

    /**
     * Get revenue statistics
     */
    async getRevenueStatistics(startDate, endDate) {
        const query = `
            SELECT 
                DATE_FORMAT(billing_month, '%Y-%m') as month,
                COUNT(*) as total_invoices,
                SUM(total_amount) as total_amount,
                SUM(CASE WHEN status = 'Đã thanh toán' THEN total_amount ELSE 0 END) as paid_amount,
                SUM(CASE WHEN status = 'Chưa thanh toán' THEN total_amount ELSE 0 END) as unpaid_amount,
                SUM(CASE WHEN status = 'Quá hạn' THEN total_amount ELSE 0 END) as overdue_amount
            FROM ${this.tableName}
            WHERE billing_month BETWEEN ? AND ?
            GROUP BY month
            ORDER BY month DESC
        `;
        return this.executeQuery(query, [startDate, endDate]);
    }

    /**
     * Get unpaid invoices for a user
     */
    async getUnpaidByUser(userId) {
        const query = `
            SELECT i.*
            FROM ${this.tableName} i
            INNER JOIN student_contracts sc ON i.contract_id = sc.id
            WHERE sc.user_id = ? AND i.status IN ('Chưa thanh toán', 'Quá hạn')
            ORDER BY i.due_date ASC
        `;
        return this.executeQuery(query, [userId]);
    }

    /**
     * Get invoices by room
     */
    async getByRoom(roomId, limit = null) {
        const query = `
            SELECT i.*, sc.user_id, u.full_name as student_name
            FROM ${this.tableName} i
            INNER JOIN student_contracts sc ON i.contract_id = sc.id
            INNER JOIN users u ON sc.user_id = u.id
            WHERE sc.room_id = ?
            ORDER BY i.billing_month DESC
            ${limit ? 'LIMIT ?' : ''}
        `;
        return this.executeQuery(query, limit ? [roomId, limit] : [roomId]);
    }
}

module.exports = new InvoiceDAO();
