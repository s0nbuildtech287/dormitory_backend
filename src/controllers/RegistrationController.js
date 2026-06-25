const RegistrationService = require('../services/RegistrationService');
const upload = require('../middlewares/upload');
const GoogleSheetsService = require('../services/GoogleSheetsService');
const ImageValidatorService = require('../services/ImageValidatorService');
const { SERVICE_ACCOUNT_EMAILS } = GoogleSheetsService;

class RegistrationController {
    /**
     * Lấy danh sách tất cả hồ sơ đăng ký
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
     * Lấy thông tin chi tiết một hồ sơ đăng ký theo ID
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
     * Tạo hồ sơ đăng ký mới (kiểm tra trạng thái đợt đăng ký và tính điểm ưu tiên)
     */
    async create(req, res, next) {
        try {
            // Kiểm tra xem cổng đăng ký trực tuyến có mở hay không
            const setting = await RegistrationService.getScoringWeightsSettings();
            if (setting && setting.value && setting.value.quotas && setting.value.quotas.registration_open === false) {
                return res.status(400).json({
                    success: false,
                    message: 'Đợt đăng ký trực tuyến hiện đang đóng. Vui lòng liên hệ ban quản lý!'
                });
            }

            const registration = await RegistrationService.createRegistration(req.body, req);
            res.status(201).json({
                success: true,
                message: 'Gửi đơn đăng ký thành công! Ban quản lý sẽ xem xét và liên hệ với bạn sớm nhất.',
                data: registration
            });
        } catch (error) {
            // Kiểm tra lỗi dữ liệu đầu vào không hợp lệ hoặc đã tồn tại
            if (error.message.includes('Missing required fields') ||
                error.message.includes('Invalid') ||
                error.message.includes('already exists')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            
            // Chuyển tiếp lỗi cho middleware xử lý lỗi tập trung
            next(error);
        }
    }

    /**
     * Cập nhật thông tin hồ sơ đăng ký phòng
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
     * Phê duyệt hồ sơ đăng ký phòng
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
     * Từ chối hồ sơ đăng ký phòng
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
     * Xóa hồ sơ đăng ký phòng
     */
    async delete(req, res, next) {
        try {
            // Xác thực thông tin đăng nhập
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Yêu cầu đăng nhập tài khoản'
                });
            }

            // Kiểm tra phân quyền (chỉ ADMIN/STAFF mới được xóa hồ sơ đăng ký)
            if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'STAFF') {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền thực hiện chức năng này'
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
     * Nhập danh sách hồ sơ từ file Excel
     */
    async importExcel(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng chọn file Excel để nhập dữ liệu'
                });
            }

            // Dùng 'system' nếu chưa đăng nhập (phục vụ viết test)
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
     * Lấy số liệu thống kê hồ sơ đăng ký
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
     * Tính toán lại điểm số ưu tiên cho toàn bộ hồ sơ
     * Được gọi khi quản trị viên thay đổi cài đặt trọng số ưu tiên
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
     * Lấy cấu hình các trọng số điểm ưu tiên hiện tại
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
     * Cập nhật cấu hình các trọng số điểm ưu tiên
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
     * Nhập danh sách hồ sơ từ đường dẫn Google Sheets
     */
    async importGoogleSheets(req, res, next) {
        try {
            const { sheetUrl } = req.body;

            if (!sheetUrl || typeof sheetUrl !== 'string' || !sheetUrl.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Đường dẫn Google Sheets là bắt buộc'
                });
            }

            // Kiểm tra định dạng cơ bản của URL
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
     * Lấy danh sách email tài khoản dịch vụ Google để chia sẻ Sheet
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
     * CÁC ENDPOINT DỰ BÁO VÀ THỐNG KÊ PHỤC VỤ AUTO-ALLOCATE (DÙNG CHO AI)
     */

    /**
     * GET /api/registrations/room-forecast?days=30
     * Dự báo phòng trống trong số ngày tới
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
     * Duyệt hàng loạt hồ sơ → tạo hợp đồng Pending (chưa gán phòng)
     */
    async autoAllocate(req, res, next) {
        try {
            const { faculty, simulate, allowOverflow, tempQuotas } = req.body;
            const result = await RegistrationService.bulkApproveRegistrations({
                faculty,
                adminId: req.user.userId,
                simulate: !!simulate,
                allowOverflow: !!allowOverflow,
                tempQuotas,
                req
            });
            res.json({
                success: true,
                message: result.isSimulation 
                    ? `Mô phỏng thành công: ${result.processed} hồ sơ đủ điều kiện duyệt.`
                    : `Đã duyệt ${result.processed} hồ sơ. Chuyển sang Hợp đồng sinh viên (chờ gán phòng).`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy trạng thái đóng/mở đợt đăng ký trực tuyến hiện tại
     */
    async getStatus(req, res, next) {
        try {
            const setting = await RegistrationService.getScoringWeightsSettings();
            const isOpen = setting && setting.value && setting.value.quotas && setting.value.quotas.registration_open !== false;
            res.json({
                success: true,
                data: {
                    registration_open: isOpen
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new RegistrationController();
