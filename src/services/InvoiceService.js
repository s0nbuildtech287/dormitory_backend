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
                throw new Error('Room not found');
            }

            // Get active contracts for this room
            const contracts = await StudentContractDAO.findByRoomId(roomId);
            if (contracts.length === 0) {
                throw new Error('No active contracts found for this room');
            }

            const invoices = [];

            // Create invoice for each contract
            for (const contract of contracts) {
                const invoiceData = {
                    contract_id: contract.id,
                    billing_month: billingMonth,
                    rent_amount: contract.rent_price,
                    electric_start: meterReadings.electric_start,
                    electric_end: meterReadings.electric_end,
                    electric_rate: meterReadings.electric_rate || 3500,
                    water_start: meterReadings.water_start,
                    water_end: meterReadings.water_end,
                    water_rate: meterReadings.water_rate || 15000,
                    other_fees: meterReadings.other_fees || 0,
                    due_date: meterReadings.due_date,
                    note: meterReadings.note
                };

                const invoice = await this.createInvoice(invoiceData, adminId, req);
                invoices.push(invoice);
            }

            // Update room meter readings
            await RoomDAO.updateMeterReadings(roomId, meterReadings.electric_end, meterReadings.water_end);

            return invoices;
        } catch (error) {
            throw new Error(`Create invoice from room failed: ${error.message}`);
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
