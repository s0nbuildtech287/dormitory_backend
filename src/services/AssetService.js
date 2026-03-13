const AssetDAO = require('../dao/AssetDAO');

class AssetService {
    /**
     * Generate unique asset ID
     */
    generateAssetId() {
        return `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get all assets
     */
    async getAssets(filters) {
        try {
            return await AssetDAO.findAll(filters);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get asset summary grouped by asset_code
     */
    async getAssetSummary() {
        try {
            return await AssetDAO.getAssetSummary();
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get asset by ID
     */
    async getAssetById(id) {
        try {
            const asset = await AssetDAO.findById(id);
            if (!asset) {
                throw new Error('Asset not found');
            }
            return asset;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Create new asset
     */
    async createAsset(assetData, userId) {
        try {
            const newAsset = {
                id: this.generateAssetId(),
                ...assetData,
                created_by: userId,
            };

            return await AssetDAO.create(newAsset);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update asset
     */
    async updateAsset(id, assetData) {
        try {
            const existingAsset = await AssetDAO.findById(id);
            if (!existingAsset) {
                throw new Error('Asset not found');
            }

            return await AssetDAO.update(id, assetData);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Delete asset
     */
    async deleteAsset(id) {
        try {
            const existingAsset = await AssetDAO.findById(id);
            if (!existingAsset) {
                throw new Error('Asset not found');
            }

            return await AssetDAO.delete(id);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get asset statistics
     */
    async getStatistics() {
        try {
            return await AssetDAO.getStatistics();
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new AssetService();
