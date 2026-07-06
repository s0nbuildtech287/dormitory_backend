const AssetService = require('../services/AssetService');

class AssetController {
    /**
     * Lấy danh sách toàn bộ tài sản hoặc tóm tắt tài sản
     */
    async getAll(req, res, next) {
        try {
            const { summary } = req.query;

            // Nếu summary=true, trả về danh sách tóm tắt gộp theo mã tài sản (asset_code)
            if (summary === 'true') {
                const assetSummary = await AssetService.getAssetSummary();
                return res.json({
                    success: true,
                    data: assetSummary
                });
            }

            // Ngược lại, trả về toàn bộ tài sản kèm bộ lọc
            const filters = {
                search: req.query.search,
                category: req.query.category,
                status: req.query.status,
                room_id: req.query.room_id
            };

            const assets = await AssetService.getAssets(filters);
            res.json({
                success: true,
                data: assets
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy chi tiết thông tin tài sản theo ID
     */
    async getById(req, res, next) {
        try {
            const asset = await AssetService.getAssetById(req.params.id);
            res.json({
                success: true,
                data: asset
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Khởi tạo tài sản mới
     */
    async create(req, res, next) {
        try {
            const asset = await AssetService.createAsset(req.body, req.user.userId);
            res.status(201).json({
                success: true,
                message: 'Asset created successfully',
                data: asset
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cập nhật thông tin tài sản
     */
    async update(req, res, next) {
        try {
            const asset = await AssetService.updateAsset(req.params.id, req.body);
            res.json({
                success: true,
                message: 'Asset updated successfully',
                data: asset
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Xóa tài sản
     */
    async delete(req, res, next) {
        try {
            await AssetService.deleteAsset(req.params.id);
            res.json({
                success: true,
                message: 'Asset deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy phân bổ tài sản theo từng tòa nhà
     */
    async getAssetsByBuilding(req, res, next) {
        try {
            const buildingData = await AssetService.getAssetsByBuilding();
            res.json({
                success: true,
                data: buildingData
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy số liệu thống kê tài sản tổng quan
     */
    async getStatistics(req, res, next) {
        try {
            const stats = await AssetService.getStatistics();
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Nhập tài sản vào kho
     */
    async importAsset(req, res, next) {
        try {
            const asset = await AssetService.importAsset(req.body, req.user.userId);
            res.status(201).json({
                success: true,
                message: 'Asset imported successfully',
                data: asset
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Xuất bàn giao tài sản từ kho về phòng
     */
    async exportAsset(req, res, next) {
        try {
            const asset = await AssetService.exportAsset(req.body, req.user.userId);
            res.status(201).json({
                success: true,
                message: 'Asset exported successfully',
                data: asset
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy danh sách tài sản theo ID phòng
     */
    async getAssetsByRoom(req, res, next) {
        try {
            const assets = await AssetService.getAssetsByRoom(req.params.roomId);
            res.json({
                success: true,
                data: assets
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy lịch sử nhập/xuất kho tài sản
     */
    async getHistory(req, res, next) {
        try {
            const filters = {
                type: req.query.type, // 'import' (nhập kho) hoặc 'export' (xuất kho)
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                limit: req.query.limit || 100
            };

            const history = await AssetService.getHistory(filters);
            res.json({
                success: true,
                data: history
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy cấu hình giới hạn định mức tài sản của phòng
     */
    async getAssetLimits(req, res, next) {
        try {
            const limits = await AssetService.getAssetLimits();
            res.json({
                success: true,
                data: limits
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cập nhật cấu hình giới hạn định mức tài sản của phòng
     */
    async updateAssetLimits(req, res, next) {
        try {
            const limits = req.body;
            const userId = req.user?.userId || null;

            const setting = await AssetService.updateAssetLimits(limits, userId);
            res.json({
                success: true,
                message: 'Asset limits updated successfully',
                data: setting
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy cấu hình nội quy bàn giao sử dụng tài sản
     */
    async getAssetRegulations(req, res, next) {
        try {
            const regulations = await AssetService.getAssetRegulations();
            res.json({
                success: true,
                data: regulations
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cập nhật cấu hình nội quy bàn giao sử dụng tài sản
     */
    async updateAssetRegulations(req, res, next) {
        try {
            const regulations = req.body;
            const userId = req.user?.userId || null;

            const setting = await AssetService.updateAssetRegulations(regulations, userId);
            res.json({
                success: true,
                message: 'Asset regulations updated successfully',
                data: setting
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AssetController();
