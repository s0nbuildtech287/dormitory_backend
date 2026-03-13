const AssetService = require('../services/AssetService');

class AssetController {
    /**
     * Get all assets or asset summary
     */
    async getAll(req, res, next) {
        try {
            const { summary } = req.query;

            // If summary=true, return grouped summary by asset_code
            if (summary === 'true') {
                const assetSummary = await AssetService.getAssetSummary();
                return res.json({
                    success: true,
                    data: assetSummary
                });
            }

            // Otherwise return all assets with filters
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
     * Get asset by ID
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
     * Create new asset
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
     * Update asset
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
     * Delete asset
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
     * Get asset distribution by building
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
     * Get asset statistics
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
}

module.exports = new AssetController();
