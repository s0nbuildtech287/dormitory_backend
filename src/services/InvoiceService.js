const InvoiceDAO = require('../dao/InvoiceDAO');
const StudentContractDAO = require('../dao/StudentContractDAO');
const RoomDAO = require('../dao/RoomDAO');
const LogSystemDAO = require('../dao/LogSystemDAO');

class InvoiceService {
    /**
     * Get all invoices with filters
     */
    async getInvoices(filters = {}) {
        try {
            return await InvoiceDAO.searchAndFilter(filters);
        } catch (error) {
            throw new Error(`Get invoices failed: ${error.message}`);
        }
    }

    /**
     * Get invoice by ID
     */
    async getInvoiceById(id) {
        try {
            const invoices = await InvoiceDAO.searchAndFilter({ limit: 1 });
            const invoice = invoices.find(inv => inv.id === id);
            if (!invoice) {
                throw new Error('Invoice not found');
            }
            return invoice;
        } catch (error) {
            throw new Error(`Get invoice failed: ${error.message}`);
        }
    }

    /**
     * Create new invoice manually
     */
    async createInvoice(data, adminId, req = null) {
        try {
            // Validate contract
            const contract = await StudentContractDAO.findById(data.contract_id);
            if (!contract) {
                throw new Error('Contract not found');
            }

            // Generate invoice number
            const invoiceNumber = `INV-${Date.now()}`;
            const invoiceId = `invoice-${Date.now()}`;

            const invoiceData = {
                id: invoiceId,
                invoice_number: invoiceNumber,
                ...data,
                created_by: adminId
            };

            // Calculate and create invoice
            const invoice = await InvoiceDAO.createInvoice(invoiceData);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'CREATE_INVOICE',
                'invoices',
                invoiceId,
                null,
                invoice,
                req
            );

            return invoice;
        } catch (error) {
            throw new Error(`Create invoice failed: ${error.message}`);
        }
    }

    /**
     * Create invoice from room meter readings
     */
    async createInvoiceFromRoom(roomId, billingMonth, meterReadings, adminId, req = null) {
        try {
            const room = await RoomDAO.findById(roomId);
            if (!room) {
                throw new Error('Không tìm thấy phòng');
            }

            // Check if room has occupants
            if (!room.current_occupancy || room.current_occupancy === 0) {
                throw new Error('Phòng chưa có sinh viên ở');
            }

            // Check if invoice already exists for this room and month
            const exists = await InvoiceDAO.existsForRoomAndMonth(roomId, billingMonth);
            if (exists) {
                throw new Error('Hóa đơn cho phòng này trong tháng đã tồn tại');
            }

            // Generate invoice number: HD-YYYYMM-XXXXX
            const billingDate = new Date(billingMonth);
            const yearMonth = `${billingDate.getFullYear()}${(billingDate.getMonth() + 1).toString().padStart(2, '0')}`;
            
            // Get count of invoices for this month to generate sequential number
            const countResult = await InvoiceDAO.executeQuery(
                `SELECT COUNT(*) as count FROM invoices WHERE billing_month = $1`,
                [billingMonth]
            );
            const count = parseInt(countResult[0]?.count || 0);
            const sequentialNumber = (10000 + count + 1).toString();
            
            const invoiceNumber = `HD-${yearMonth}-${sequentialNumber}`;
            const invoiceId = `invoice-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

            // Calculate due date (10th of next month)
            const dueDate = new Date(billingDate.getFullYear(), billingDate.getMonth() + 1, 10);

            // Prepare invoice data
            const invoiceData = {
                id: invoiceId,
                invoice_number: invoiceNumber,
                room_id: roomId,
                billing_month: billingMonth,
                rent_per_person: 500000,
                occupancy: room.current_occupancy, // Number of people in room
                rent_amount: room.current_occupancy * 500000, // 500k per person
                electric_start: 0,
                electric_end: meterReadings.electric_end || 0,
                electric_rate: 3500,
                water_start: 0,
                water_end: meterReadings.water_end || 0,
                water_rate: 15000,
                garbage_fee: 70000,
                internet_fee: 300000,
                parking_fee_per_vehicle: 50000,
                parking_count: room.current_occupancy, // Assume 1 vehicle per person
                parking_fee: room.current_occupancy * 50000,
                discount_amount: 0,
                penalty_amount: 0,
                due_date: dueDate.toISOString().split('T')[0],
                status: 'Chưa thanh toán',
                created_by: adminId
            };

            // Create invoice
            const invoice = await InvoiceDAO.createInvoice(invoiceData);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'CREATE_INVOICE',
                'invoices',
                invoiceId,
                null,
                invoice,
                req
            );

            return invoice;
        } catch (error) {
            // Throw only the Vietnamese message without English prefix
            throw error;
        }
    }

    /**
     * Mark invoice as paid
     */
    async markAsPaid(id, paymentMethod, adminId, req = null) {
        try {
            const oldData = await InvoiceDAO.findById(id);
            if (!oldData) {
                throw new Error('Invoice not found');
            }

            await InvoiceDAO.markAsPaid(id, paymentMethod);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'MARK_INVOICE_PAID',
                'invoices',
                id,
                { status: oldData.status },
                { status: 'Đã thanh toán', payment_method: paymentMethod },
                req
            );

            return await InvoiceDAO.findById(id);
        } catch (error) {
            throw new Error(`Mark invoice as paid failed: ${error.message}`);
        }
    }

    /**
     * Update invoice
     */
    async updateInvoice(id, data, adminId, req = null) {
        try {
            const oldData = await InvoiceDAO.findById(id);
            if (!oldData) {
                throw new Error('Invoice not found');
            }

            // Recalculate total if meter readings changed
            if (data.electric_start || data.electric_end || data.water_start || data.water_end) {
                const electricUsage = (data.electric_end || oldData.electric_end) - (data.electric_start || oldData.electric_start);
                const waterUsage = (data.water_end || oldData.water_end) - (data.water_start || oldData.water_start);
                
                const electricCost = electricUsage * (data.electric_rate || oldData.electric_rate);
                const waterCost = waterUsage * (data.water_rate || oldData.water_rate);
                
                data.total_amount = (data.rent_amount || oldData.rent_amount) + electricCost + waterCost + (data.other_fees || oldData.other_fees || 0);
            }

            await InvoiceDAO.update(id, data);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'UPDATE_INVOICE',
                'invoices',
                id,
                oldData,
                data,
                req
            );

            return await InvoiceDAO.findById(id);
        } catch (error) {
            throw new Error(`Update invoice failed: ${error.message}`);
        }
    }

    /**
     * Get revenue statistics
     */
    async getRevenueStatistics(startDate, endDate) {
        try {
            return await InvoiceDAO.getRevenueStatistics(startDate, endDate);
        } catch (error) {
            throw new Error(`Get revenue statistics failed: ${error.message}`);
        }
    }

    /**
     * Get invoices by user
     */
    async getInvoicesByUser(userId) {
        try {
            return await InvoiceDAO.getUnpaidByUser(userId);
        } catch (error) {
            throw new Error(`Get user invoices failed: ${error.message}`);
        }
    }

    /**
     * Update overdue invoices (should be run daily)
     */
    async updateOverdueInvoices(req = null) {
        try {
            const count = await InvoiceDAO.updateOverdueInvoices();

            // Log action
            if (req && req.user) {
                await LogSystemDAO.log(
                    req.user.userId,
                    'UPDATE_OVERDUE_INVOICES',
                    'invoices',
                    null,
                    null,
                    { updated_count: count },
                    req
                );
            }

            return { updated: count };
        } catch (error) {
            throw new Error(`Update overdue invoices failed: ${error.message}`);
        }
    }

    /**
     * Delete invoice (only if unpaid)
     */
    async deleteInvoice(id, adminId, req = null) {
        try {
            const invoice = await InvoiceDAO.findById(id);
            if (!invoice) {
                throw new Error('Invoice not found');
            }

            if (invoice.status === 'Đã thanh toán') {
                throw new Error('Cannot delete paid invoice');
            }

            await InvoiceDAO.delete(id);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'DELETE_INVOICE',
                'invoices',
                id,
                invoice,
                null,
                req
            );

            return true;
        } catch (error) {
            throw new Error(`Delete invoice failed: ${error.message}`);
        }
    }
}

module.exports = new InvoiceService();
