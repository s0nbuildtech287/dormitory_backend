const SettingsService = require('../services/SettingsService');

class SettingsController {
    /**
     * Get settings by category
     */
    async getSettingsByCategory(req, res, next) {
        try {
            const { category } = req.params;
            const settings = await SettingsService.getSettingsByCategory(category);
            res.json({
                success: true,
                data: settings
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all settings grouped by category
     */
    async getAllSettings(req, res, next) {
        try {
            const settings = await SettingsService.getAllSettingsGrouped();
            res.json({
                success: true,
                data: settings
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get scoring weights (for backward compatibility)
     */
    async getScoringWeights(req, res, next) {
        try {
            const setting = await SettingsService.getScoringWeights();
            res.json({
                success: true,
                data: setting
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update scoring weights (for backward compatibility)
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

            const result = await SettingsService.updateScoringWeights(scoringWeights, req);
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
     * Update setting by ID
     */
    async updateSetting(req, res, next) {
        try {
            const { id } = req.params;
            const { value } = req.body;

            if (value === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Value is required'
                });
            }

            const result = await SettingsService.updateSetting(id, value, req);
            res.json({
                success: true,
                message: 'Setting updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create new setting
     */
    async createSetting(req, res, next) {
        try {
            const settingData = req.body;

            if (!settingData.category || !settingData.name || settingData.value === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Category, name, and value are required'
                });
            }

            const result = await SettingsService.createSetting(settingData, req);
            res.status(201).json({
                success: true,
                message: 'Setting created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SettingsController();