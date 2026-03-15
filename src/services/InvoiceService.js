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
            // Auto-update overdue invoices before fetching
            await InvoiceDAO.updateOverdueInvoices();
            
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

            // Get pricing settings
            const pricingSettings = await this.getPricingSettings();
            const pricing = pricingSettings.value;

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

            // Calculate due date using pricing settings
            const dueDate = new Date(billingDate.getFullYear(), billingDate.getMonth() + 1, pricing.dueDateDay || 10);

            // Prepare invoice data using pricing settings
            const invoiceData = {
                id: invoiceId,
                invoice_number: invoiceNumber,
                room_id: roomId,
                billing_month: billingMonth,
                rent_per_person: pricing.rentPerPerson,
                occupancy: room.current_occupancy,
                rent_amount: room.current_occupancy * pricing.rentPerPerson,
                electric_start: pricing.electricStart || 0,
                electric_end: meterReadings.electric_end || 0,
                electric_rate: pricing.electricRate,
                water_start: pricing.waterStart || 0,
                water_end: meterReadings.water_end || 0,
                water_rate: pricing.waterRate,
                garbage_fee: pricing.garbageFee,
                internet_fee: pricing.internetFee,
                parking_fee_per_vehicle: pricing.parkingFeePerVehicle,
                parking_count: room.current_occupancy, // Assume 1 vehicle per person
                parking_fee: room.current_occupancy * pricing.parkingFeePerVehicle,
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
            if (data.electric_start != null || data.electric_end != null || data.water_start != null || data.water_end != null) {
                const electricUsage = (data.electric_end ?? oldData.electric_end) - (data.electric_start ?? oldData.electric_start);
                const waterUsage = (data.water_end ?? oldData.water_end) - (data.water_start ?? oldData.water_start);

                const electricCost = Math.max(0, electricUsage) * (data.electric_rate ?? oldData.electric_rate);
                const waterCost = Math.max(0, waterUsage) * (data.water_rate ?? oldData.water_rate);

                const serviceFees = data.service_fees ?? oldData.service_fees ?? 0;
                const discount = data.discount_amount ?? oldData.discount_amount ?? 0;
                const penalty = data.penalty_amount ?? oldData.penalty_amount ?? 0;
                const rent = data.rent_amount ?? oldData.rent_amount ?? 0;

                // Only recalculate if frontend didn't already send total_amount
                if (data.total_amount == null) {
                    data.total_amount = rent + electricCost + waterCost + serviceFees - discount + penalty;
                }

                data.electric_amount = electricCost;
                data.water_amount = waterCost;
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
     * Get invoice statistics
     */
    async getStatistics(month = null) {
        try {
            // Auto-update overdue invoices before getting statistics
            await InvoiceDAO.updateOverdueInvoices();
            
            return await InvoiceDAO.getStatistics(month);
        } catch (error) {
            throw new Error(`Get invoice statistics failed: ${error.message}`);
        }
    }

    /**
     * Get revenue statistics (deprecated - use getStatistics instead)
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
            // Only update invoices where due_date is in the past (before today)
            const count = await InvoiceDAO.updateOverdueInvoices();

            // Log action
            if (req && req.user) {
                await LogSystemDAO.log(
                    req.user.userId,
                    'UPDATE_OVERDUE_INVOICES',
                    'invoices',
                    null,
                    null,
                    { updated_count: count, updated_at: new Date() },
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

            if (invoice.status === 'Chưa thanh toán' || invoice.status === 'Quá hạn') {
                throw new Error(`Không thể xóa hóa đơn đang ở trạng thái "${invoice.status}". Chỉ được xóa hóa đơn đã thanh toán.`);
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

    /**
     * Get pricing settings
     */
    async getPricingSettings() {
        try {
            let setting = await InvoiceDAO.getPricingSettings();

            // If not found, create default settings
            if (!setting) {
                console.log('⚠️ pricing_config not found, creating default...');

                const defaultPricing = {
                    id: 'pricing_config',
                    category: 'pricing',
                    name: 'pricing_config',
                    value: {
                        rentPerPerson: 500000,
                        electricRate: 3500,
                        electricStart: 0,
                        waterRate: 15000,
                        waterStart: 0,
                        garbageFee: 70000,
                        internetFee: 300000,
                        parkingFeePerVehicle: 50000,
                        dueDateDay: 10
                    },
                    description: 'Cấu hình bảng giá tiền phòng, điện, nước và dịch vụ',
                    is_active: true
                };

                setting = await InvoiceDAO.createPricingSettings(defaultPricing);
                console.log('✅ Default pricing_config created successfully');
            }

            return setting;
        } catch (error) {
            throw new Error(`Get pricing settings failed: ${error.message}`);
        }
    }

    /**
     * Update pricing settings
     */
    async updatePricingSettings(pricingData, req = null) {
        try {
            // Validate pricing data
            this.validatePricingSettings(pricingData);

            const result = await InvoiceDAO.updatePricingSettings(pricingData, req?.user?.userId);

            // Log action
            if (req && req.user) {
                await LogSystemDAO.log(
                    req.user.userId,
                    'UPDATE_PRICING_SETTINGS',
                    'settings',
                    'pricing_config',
                    null,
                    pricingData,
                    req
                );
            }

            return result;
        } catch (error) {
            throw new Error(`Update pricing settings failed: ${error.message}`);
        }
    }

    /**
     * Validate pricing settings structure
     */
    validatePricingSettings(pricing) {
        const requiredFields = [
            'rentPerPerson',
            'electricRate',
            'waterRate',
            'garbageFee',
            'internetFee',
            'parkingFeePerVehicle',
            'dueDateDay'
        ];

        for (const field of requiredFields) {
            if (pricing[field] === undefined || pricing[field] === null) {
                throw new Error(`Missing required field: ${field}`);
            }

            if (typeof pricing[field] !== 'number' || pricing[field] < 0) {
                throw new Error(`Invalid ${field}: must be a positive number`);
            }
        }

        // Validate dueDateDay range
        if (pricing.dueDateDay < 1 || pricing.dueDateDay > 28) {
            throw new Error('dueDateDay must be between 1 and 28');
        }
    }
}

module.exports = new InvoiceService();
