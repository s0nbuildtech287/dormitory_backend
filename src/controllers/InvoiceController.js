const InvoiceService = require('../services/InvoiceService');

class InvoiceController {
    /**
     * Get all invoices
     */
    async getAll(req, res, next) {
        try {
            const filters = {
                status: req.query.status,
                month: req.query.month,
                searchTerm: req.query.search,
                limit: req.query.limit ? parseInt(req.query.limit) : null
            };

            const invoices = await InvoiceService.getInvoices(filters);
            res.json({
                success: true,
                data: invoices
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get invoice by ID
     */
    async getById(req, res, next) {
        try {
            const invoice = await InvoiceService.getInvoiceById(req.params.id);
            res.json({
                success: true,
                data: invoice
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create new invoice
     */
    async create(req, res, next) {
        try {
            const invoice = await InvoiceService.createInvoice(req.body, req.user.userId, req);
            res.status(201).json({
                success: true,
                message: 'Invoice created successfully',
                data: invoice
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create invoice from room meter readings
     */
    async createFromRoom(req, res, next) {
        try {
            const { roomId, billingMonth, meterReadings } = req.body;

            if (!roomId || !billingMonth || !meterReadings) {
                return res.status(400).json({
                    success: false,
                    message: 'Room ID, billing month, and meter readings are required'
                });
            }

            const invoice = await InvoiceService.createInvoiceFromRoom(
                roomId,
                billingMonth,
                meterReadings,
                req.user.userId,
                req
            );
            res.status(201).json({
                success: true,
                message: 'Invoice created successfully',
                data: invoice
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update invoice
     */
    async update(req, res, next) {
        try {
            const invoice = await InvoiceService.updateInvoice(
                req.params.id,
                req.body,
                req.user.userId,
                req
            );
            res.json({
                success: true,
                message: 'Invoice updated successfully',
                data: invoice
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mark invoice as paid
     */
    async markAsPaid(req, res, next) {
        try {
            const { paymentMethod } = req.body;
            const invoice = await InvoiceService.markAsPaid(
                req.params.id,
                paymentMethod || 'Tiền mặt',
                req.user.userId,
                req
            );
            res.json({
                success: true,
                message: 'Invoice marked as paid successfully',
                data: invoice
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete invoice
     */
    async delete(req, res, next) {
        try {
            await InvoiceService.deleteInvoice(req.params.id, req.user.userId, req);
            res.json({
                success: true,
                message: 'Invoice deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get revenue statistics
     */
    async getRevenueStatistics(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Start date and end date are required'
                });
            }

            const statistics = await InvoiceService.getRevenueStatistics(startDate, endDate);
            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get invoices by user
     */
    async getByUser(req, res, next) {
        try {
            const userId = req.params.userId || req.user.userId;
            const invoices = await InvoiceService.getInvoicesByUser(userId);
            res.json({
                success: true,
                data: invoices
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update overdue invoices
     */
    async updateOverdue(req, res, next) {
        try {
            const result = await InvoiceService.updateOverdueInvoices(req);
            res.json({
                success: true,
                message: `Updated ${result.updated} overdue invoice(s)`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get pricing settings
     */
    async getPricingSettings(req, res, next) {
        try {
            const settings = await InvoiceService.getPricingSettings();
            res.json({
                success: true,
                data: settings
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update pricing settings
     */
    async updatePricingSettings(req, res, next) {
        try {
            const { value } = req.body;

            if (!value) {
                return res.status(400).json({
                    success: false,
                    message: 'Pricing value is required'
                });
            }

            const result = await InvoiceService.updatePricingSettings(value, req);
            res.json({
                success: true,
                message: 'Pricing settings updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new InvoiceController();
