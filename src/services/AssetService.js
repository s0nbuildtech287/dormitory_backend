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
     * Get asset distribution by building
     */
    async getAssetsByBuilding() {
        try {
            return await AssetDAO.getAssetsByBuilding();
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

    /**
     * Import asset to warehouse
     */
    async importAsset(importData, userId) {
        try {
            // Validate required fields
            if (!importData.asset_code || !importData.asset_name || !importData.quantity) {
                throw new Error('Missing required fields: asset_code, asset_name, quantity');
            }

            if (importData.quantity <= 0) {
                throw new Error('Quantity must be greater than 0');
            }

            const newImport = {
                id: this.generateAssetId(),
                ...importData,
                created_by: userId,
            };

            return await AssetDAO.importAsset(newImport);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Export asset from warehouse to room
     */
    async exportAsset(exportData, userId) {
        try {
            // Validate required fields
            if (!exportData.asset_code || !exportData.asset_name || !exportData.quantity || !exportData.room_id) {
                throw new Error('Missing required fields: asset_code, asset_name, quantity, room_id');
            }

            if (exportData.quantity <= 0) {
                throw new Error('Quantity must be greater than 0');
            }

            const newExport = {
                id: this.generateAssetId(),
                ...exportData,
                created_by: userId,
            };

            return await AssetDAO.exportAsset(newExport);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get assets by room
     */
    async getAssetsByRoom(roomId) {
        try {
            return await AssetDAO.findByRoom(roomId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get import/export history
     */
    async getHistory(filters) {
        try {
            const history = await AssetDAO.getHistory(filters);
            
            // Format history data
            return history.map(log => {
                const newValue = log.new_value || {};
                const isImport = log.action === 'IMPORT_ASSET';
                
                // Prioritize data from new_value, fallback to joined asset data
                const assetCode = newValue.asset_code || log.asset_code || '---';
                const assetName = newValue.asset_name || log.asset_name || '---';
                const unit = newValue.unit || log.unit || 'Cái';
                const purchasePrice = newValue.purchase_price || log.purchase_price || 0;
                
                return {
                    id: log.id,
                    type: isImport ? 'import' : 'export',
                    asset_code: assetCode,
                    asset_name: assetName,
                    quantity: newValue.import_quantity || newValue.export_quantity || 0,
                    unit: unit,
                    date: log.created_at,
                    supplier: newValue.supplier || '---',
                    invoice_number: newValue.invoice_number || '---',
                    price: purchasePrice,
                    total_price: newValue.total_price || (purchasePrice * (newValue.import_quantity || 0)),
                    export_to: newValue.export_to || '---',
                    room_number: newValue.room_number || '---',
                    recipient_name: newValue.recipient_name || '---',
                    recipient_phone: newValue.recipient_phone || '---',
                    purpose: newValue.purpose || '---',
                    notes: newValue.notes || '',
                    created_by: log.created_by_name || 'Unknown',
                };
            });
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new AssetService();
