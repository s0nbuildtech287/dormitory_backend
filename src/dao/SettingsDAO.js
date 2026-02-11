const BaseDAO = require('./BaseDAO');

class SettingsDAO extends BaseDAO {
    constructor() {
        super('settings');
    }

    /**
     * Get settings by category
     */
    async getSettingsByCategory(category) {
        return this.findAll({ category, is_active: true });
    }

    /**
     * Get setting by ID
     */
    async getSettingById(id) {
        return this.findOne({ id, is_active: true });
    }

    /**
     * Get setting by category and name
     */
    async getSettingByName(category, name) {
        return this.findOne({ category, name, is_active: true });
    }

    /**
     * Update setting
     */
    async updateSetting(id, value, updatedBy = null) {
        const updateData = {
            value: value,
            updated_by: updatedBy,
            updated_at: new Date()
        };

        return await this.update(id, updateData);
    }

    /**
     * Create new setting
     */
    async createSetting(settingData) {
        return await this.create(settingData);
    }

    /**
     * Get all settings grouped by category
     */
    async getAllSettingsGrouped() {
        const settings = await this.findAll({ is_active: true });
        const grouped = {};

        settings.forEach(setting => {
            if (!grouped[setting.category]) {
                grouped[setting.category] = {};
            }
            grouped[setting.category][setting.name] = setting;
        });

        return grouped;
    }
}

module.exports = new SettingsDAO();