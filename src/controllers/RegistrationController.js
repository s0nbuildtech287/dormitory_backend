const RegistrationService = require('../services/RegistrationService');
const upload = require('../middlewares/upload');
const GoogleSheetsService = require('../services/GoogleSheetsService');
const ImageValidatorService = require('../services/ImageValidatorService');
const { SERVICE_ACCOUNT_EMAILS } = GoogleSheetsService;

class RegistrationController {
    /**
     * Get all registrations
     */
    async getAll(req, res, next) {
        try {
            const filters = {
                status: req.query.status,
                gender: req.query.gender,
                searchTerm: req.query.search,
                aiSuggestion: req.query.aiSuggestion,
                limit: req.query.limit ? parseInt(req.query.limit) : null
            };

            const registrations = await RegistrationService.getRegistrations(filters);
            res.json({
                success: true,
                data: registrations
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get registration by ID
     */
    async getById(req, res, next) {
        try {
            const registration = await RegistrationService.getRegistrationById(req.params.id);
            res.json({
                success: true,
                data: registration
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create new registration with validation and scoring
     */
    async create(req, res, next) {
        try {
            const registration = await RegistrationService.createRegistration(req.body, req);
            res.status(201).json({
                success: true,
                message: 'Gửi đơn đăng ký thành công! Ban quản lý sẽ xem xét và liên hệ với bạn sớm nhất.',
                data: registration
            });
        } catch (error) {
            // Check for validation errors
            if (error.message.includes('Missing required fields') ||
                error.message.includes('Invalid') ||
                error.message.includes('already exists')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            
            // Pass other errors to error handler
            next(error);
        }
    }

    /**
     * Update registration
     */
    async update(req, res, next) {
        try {
            const registration = await RegistrationService.updateRegistration(
                req.params.id,
                req.body,
                req.user.userId,
                req
            );
            res.json({
                success: true,
                message: 'Registration updated successfully',
                data: registration
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Approve registration
     */
    async approve(req, res, next) {
        try {
            const { note } = req.body;
            const registration = await RegistrationService.approveRegistration(
                req.params.id,
                req.user.userId,
                note,
                req
            );
            res.json({
                success: true,
                message: 'Registration approved successfully',
                data: registration
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reject registration
     */
    async reject(req, res, next) {
        try {
            const { note } = req.body;
            if (!note) {
                return res.status(400).json({
                    success: false,
                    message: 'Rejection note is required'
                });
            }

            const registration = await RegistrationService.rejectRegistration(
                req.params.id,
                req.user.userId,
                note,
                req
            );
            res.json({
                success: true,
                message: 'Registration rejected successfully',
                data: registration
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete registration
     */
    async delete(req, res, next) {
        try {
            // Validate authentication
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Not authenticated'
                });
            }

            // Validate authorization (only admin can delete)
            if (req.user.role !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    message: 'Only admins can delete registrations'
                });
            }

            const registration = await RegistrationService.deleteRegistration(
                req.params.id,
                req.user.userId,
                req
            );
            res.json({
                success: true,
                message: 'Registration deleted successfully',
                data: registration
            });
        } catch (error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }

    /**
     * Import registrations from Excel
     */
    async importExcel(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Excel file is required'
                });
            }

            // Use 'system' as userId if no authentication (for testing)
            const userId = req.user?.userId || 'system';

            const result = await RegistrationService.importFromExcel(
                req.file.path,
                userId,
                req
            );
            res.json({
                success: true,
                message: `Imported ${result.success} registrations`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get statistics
     */
    async getStatistics(req, res, next) {
        try {
            const statistics = await RegistrationService.getStatistics();
            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Recalculate scores for all registrations
     * Used when admin updates scoring weights/settings
     */
    async recalculateScores(req, res, next) {
        try {
            const result = await RegistrationService.recalculateAllScores(
                req.user.userId,
                req
            );
            res.json({
                success: true,
                message: `Recalculated ${result.updated} registrations`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get scoring weights
     */
    async getScoringWeights(req, res, next) {
        try {
            const setting = await RegistrationService.getScoringWeightsSettings();
            res.json({
                success: true,
                data: setting
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update scoring weights
     */
    async updateScoringWeights(req, res, next) {
        try {
            const { scoringWeights } = req.body;

            if (!scoringWeights) {
                return res.status(400).json({
                    success: false,
                    message: 'Scoring weights are required'
                });
            }

            const result = await RegistrationService.updateScoringWeightsSettings(scoringWeights, req);
            res.json({
                success: true,
                message: 'Scoring weights updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Import registrations from Google Sheets URL
     */
    async importGoogleSheets(req, res, next) {
        try {
            const { sheetUrl } = req.body;

            if (!sheetUrl || typeof sheetUrl !== 'string' || !sheetUrl.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'URL Google Sheets là bắt buộc'
                });
            }

            // Basic URL validation
            const trimmedUrl = sheetUrl.trim();
            if (!trimmedUrl.includes('docs.google.com/spreadsheets') && !trimmedUrl.match(/^[a-zA-Z0-9_-]+$/)) {
                return res.status(400).json({
                    success: false,
                    message: 'URL không hợp lệ. Vui lòng dán đúng link Google Sheets'
                });
            }

            const userId = req.user?.userId || 'system';
            const result = await RegistrationService.importFromGoogleSheets(
                trimmedUrl,
                userId,
                req
            );

            res.json({
                success: true,
                message: `Đồng bộ thành công ${result.success} hồ sơ từ Google Sheets`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Debug: đọc raw data từ Google Sheets, trả về headers + 3 hàng đầu để kiểm tra mapping
     */
    async debugSheet(req, res, next) {
        try {
            const { sheetUrl } = req.body;
            if (!sheetUrl) return res.status(400).json({ success: false, message: 'Thiếu sheetUrl' });

            const rawData = await GoogleSheetsService.readSheet(sheetUrl);
            res.json({
                success: true,
                headers: rawData.length > 0 ? Object.keys(rawData[0]) : [],
                preview: rawData.slice(0, 3),
                total: rawData.length,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get service account emails (for admin to share the sheet with)
     */
    async getServiceAccountEmails(req, res, next) {
        try {
            res.json({
                success: true,
                data: SERVICE_ACCOUNT_EMAILS
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/registrations/:id/validate-images
     * Kích hoạt xác thực lại ảnh minh chứng cho một hồ sơ
     */
    async validateImages(req, res, next) {
        try {
            const { id } = req.params;
            const adminId = req.user?.userId || 'system';

            // Reset về PENDING trước
            const RegisterFormDAO = require('../dao/RegisterFormDAO');
            await RegisterFormDAO.update(id, { vision_status: 'PENDING' });

            // Chạy validation (await để trả kết quả ngay)
            const result = await ImageValidatorService.validateRegistrationImages(id, adminId);

            if (!result) {
                return res.json({
                    success: true,
                    message: 'Hồ sơ không có ảnh minh chứng hoặc Vision API đang tắt',
                    data: null,
                });
            }

            res.json({
                success: true,
                message: `Xác thực hoàn tất: ${result.vision_status}`,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * CAMPAIGN LAUNCHER ENDPOINTS
     */

    /**
     * GET /api/registrations/room-forecast?days=30
     * Dự báo phòng trống
     */
    async getRoomForecast(req, res, next) {
        try {
            const days = req.query.days ? parseInt(req.query.days) : 30;
            const forecast = await RegistrationService.getRoomForecast(days);
            res.json({
                success: true,
                data: forecast
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/registrations/demand-forecast
     * Dự báo nhu cầu đăng ký
     */
    async getDemandForecast(req, res, next) {
        try {
            const forecast = await RegistrationService.getDemandForecast();
            res.json({
                success: true,
                data: forecast
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/registrations/auto-allocate
     * AI Bulk Auto-Allocation and Room Assignment
     */
    async autoAllocate(req, res, next) {
        try {
            const { faculty } = req.body;
            const result = await RegistrationService.autoAllocateRooms({
                faculty,
                adminId: req.user.userId,
                req
            });
            res.json({
                success: true,
                message: `Đã tự động duyệt và xếp phòng thành công cho ${result.approvedAndAssigned} sinh viên (và ${result.approvedPending} sinh viên chờ xếp phòng).`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new RegistrationController();
