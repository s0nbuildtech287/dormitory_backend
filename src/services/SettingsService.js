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
     * Validate scoring weights structure (supports both flat and 3-basket structure)
     */
    validateScoringWeights(config) {
        // Validate weights - supports both flat structure and 3-basket structure
        if (config.weights) {
            // Check if it's a 3-basket structure (has basket1, basket2, basket3)
            if (config.weights.basket1 || config.weights.basket2 || config.weights.basket3) {
                // Validate each basket
                ['basket1', 'basket2', 'basket3'].forEach(basketKey => {
                    if (config.weights[basketKey]) {
                        const { w1_priority, w2_year, w3_gpa } = config.weights[basketKey];
                        
                        if (typeof w1_priority !== 'number' || w1_priority < 0 || w1_priority > 1) {
                            throw new Error(`Invalid ${basketKey}.w1_priority: must be a number between 0 and 1`);
                        }
                        if (typeof w2_year !== 'number' || w2_year < 0 || w2_year > 1) {
                            throw new Error(`Invalid ${basketKey}.w2_year: must be a number between 0 and 1`);
                        }
                        if (typeof w3_gpa !== 'number' || w3_gpa < 0 || w3_gpa > 1) {
                            throw new Error(`Invalid ${basketKey}.w3_gpa: must be a number between 0 and 1`);
                        }

                        const totalWeight = w1_priority + w2_year + w3_gpa;
                        if (Math.abs(totalWeight - 1.0) > 0.01) {
                            throw new Error(`${basketKey} total weight must equal 1.0 (current: ${totalWeight.toFixed(2)})`);
                        }
                    }
                });
            } else {
                // Flat structure (legacy support)
                const { w1_priority, w2_year, w3_gpa } = config.weights;
                
                if (typeof w1_priority !== 'number' || w1_priority < 0 || w1_priority > 1) {
                    throw new Error('Invalid w1_priority: must be a number between 0 and 1');
                }
                if (typeof w2_year !== 'number' || w2_year < 0 || w2_year > 1) {
                    throw new Error('Invalid w2_year: must be a number between 0 and 1');
                }
                if (typeof w3_gpa !== 'number' || w3_gpa < 0 || w3_gpa > 1) {
                    throw new Error('Invalid w3_gpa: must be a number between 0 and 1');
                }

                const totalWeight = w1_priority + w2_year + w3_gpa;
                if (Math.abs(totalWeight - 1.0) > 0.01) {
                    throw new Error(`Total weight must equal 1.0 (current: ${totalWeight.toFixed(2)})`);
                }
            }
        }

        // Validate quotas (should sum to 100%)
        if (config.quotas) {
            const { totalSlots, policy_priority, freshmen, seniors } = config.quotas;
            
            // Validate total slots if provided
            if (totalSlots !== undefined && (typeof totalSlots !== 'number' || totalSlots < 0)) {
                throw new Error('Invalid totalSlots: must be a positive number');
            }
            
            if (typeof policy_priority !== 'number' || policy_priority < 0 || policy_priority > 100) {
                throw new Error('Invalid policy_priority quota');
            }
            if (typeof freshmen !== 'number' || freshmen < 0 || freshmen > 100) {
                throw new Error('Invalid freshmen quota');
            }
            if (typeof seniors !== 'number' || seniors < 0 || seniors > 100) {
                throw new Error('Invalid seniors quota');
            }

            const totalQuota = policy_priority + freshmen + seniors;
            if (Math.abs(totalQuota - 100) > 1) {
                throw new Error(`Total quota must equal 100% (current: ${totalQuota.toFixed(1)}%)`);
            }
        }

        // Validate score mappings (optional, just check structure exists)
        if (config.scoreMappings) {
            const { priority, year, gpa } = config.scoreMappings;
            
            if (!priority || !year || !gpa) {
                throw new Error('Score mappings must include priority, year, and gpa sections');
            }
        }
    }
}

module.exports = new SettingsService();