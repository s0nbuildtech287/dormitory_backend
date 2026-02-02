const SettingsDAO = require('../dao/SettingsDAO');
const LogSystemDAO = require('../dao/LogSystemDAO');

class SettingsService {
    /**
     * Get settings by category
     */
    async getSettingsByCategory(category) {
        try {
            return await SettingsDAO.getSettingsByCategory(category);
        } catch (error) {
            throw new Error(`Get settings failed: ${error.message}`);
        }
    }

    /**
     * Get all settings grouped by category
     */
    async getAllSettingsGrouped() {
        try {
            return await SettingsDAO.getAllSettingsGrouped();
        } catch (error) {
            throw new Error(`Get all settings failed: ${error.message}`);
        }
    }

    /**
     * Get scoring weights (system settings)
     */
    async getScoringWeights() {
        try {
            const setting = await SettingsDAO.getSettingByName('system', 'scoring_weights');
            if (!setting) {
                throw new Error('Scoring weights not found');
            }
            return setting;
        } catch (error) {
            throw new Error(`Get scoring weights failed: ${error.message}`);
        }
    }

    /**
     * Update scoring weights
     */
    async updateScoringWeights(scoringWeights, req = null) {
        try {
            // Validate scoring weights
            this.validateScoringWeights(scoringWeights);

            const result = await SettingsDAO.updateSetting('scoring_weights', scoringWeights, req?.user?.userId);

            // Log action
            if (req && req.user) {
                await LogSystemDAO.log(
                    req.user.userId,
                    'UPDATE_SETTINGS',
                    'settings',
                    'scoring_weights',
                    `Updated scoring weights: ${JSON.stringify(scoringWeights)}`
                );
            }

            return result;
        } catch (error) {
            throw new Error(`Update scoring weights failed: ${error.message}`);
        }
    }

    /**
     * Update setting by ID
     */
    async updateSetting(id, value, req = null) {
        try {
            const result = await SettingsDAO.updateSetting(id, value, req?.user?.userId);

            // Log action
            if (req && req.user) {
                await LogSystemDAO.log(
                    req.user.userId,
                    'UPDATE_SETTING',
                    'settings',
                    id,
                    `Updated setting value: ${JSON.stringify(value)}`
                );
            }

            return result;
        } catch (error) {
            throw new Error(`Update setting failed: ${error.message}`);
        }
    }

    /**
     * Create new setting
     */
    async createSetting(settingData, req = null) {
        try {
            const result = await SettingsDAO.createSetting({
                ...settingData,
                updated_by: req?.user?.userId
            });

            // Log action
            if (req && req.user) {
                await LogSystemDAO.log(
                    req.user.userId,
                    'CREATE_SETTING',
                    'settings',
                    result.id,
                    `Created new setting: ${settingData.name}`
                );
            }

            return result;
        } catch (error) {
            throw new Error(`Create setting failed: ${error.message}`);
        }
    }

    /**
     * Validate scoring weights structure
     */
    validateScoringWeights(weights) {
        const requiredKeys = ['year', 'distance', 'gpa', 'circumstance'];
        const totalWeight = Object.values(weights).reduce((sum, item) => sum + (item.weight || 0), 0);

        for (const key of requiredKeys) {
            if (!weights[key] || typeof weights[key].weight !== 'number') {
                throw new Error(`Invalid weight for ${key}`);
            }
        }

        if (totalWeight !== 100) {
            throw new Error('Total weight must equal 100%');
        }
    }
}

module.exports = new SettingsService();