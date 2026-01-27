const NotificationDAO = require('../dao/NotificationDAO');
const LogSystemDAO = require('../dao/LogSystemDAO');

class NotificationService {
    /**
     * Get all published notifications
     */
    async getNotifications(limit = null) {
        try {
            return await NotificationDAO.getPublished(limit);
        } catch (error) {
            throw new Error(`Get notifications failed: ${error.message}`);
        }
    }

    /**
     * Get notifications for specific user
     */
    async getNotificationsForUser(userId) {
        try {
            return await NotificationDAO.getForUser(userId);
        } catch (error) {
            throw new Error(`Get user notifications failed: ${error.message}`);
        }
    }

    /**
     * Get notification by ID
     */
    async getNotificationById(id) {
        try {
            const notification = await NotificationDAO.findById(id);
            if (!notification) {
                throw new Error('Notification not found');
            }
            return notification;
        } catch (error) {
            throw new Error(`Get notification failed: ${error.message}`);
        }
    }

    /**
     * Create and send notification
     */
    async createNotification(data, adminId, req = null) {
        try {
            const notificationId = `notif-${Date.now()}`;
            const notification = await NotificationDAO.create({
                id: notificationId,
                ...data,
                created_by: adminId
            });

            // Log action
            await LogSystemDAO.log(
                adminId,
                'CREATE_NOTIFICATION',
                'notifications',
                notificationId,
                null,
                notification,
                req
            );

            return notification;
        } catch (error) {
            throw new Error(`Create notification failed: ${error.message}`);
        }
    }

    /**
     * Send notification to all students
     */
    async sendToAllStudents(title, content, type, adminId, req = null) {
        try {
            return await this.createNotification({
                title,
                content,
                type,
                target_audience: 'STUDENTS'
            }, adminId, req);
        } catch (error) {
            throw new Error(`Send notification failed: ${error.message}`);
        }
    }

    /**
     * Send notification to specific users
     */
    async sendToSpecificUsers(title, content, type, userIds, adminId, req = null) {
        try {
            return await this.createNotification({
                title,
                content,
                type,
                target_audience: 'SPECIFIC',
                target_users: JSON.stringify(userIds)
            }, adminId, req);
        } catch (error) {
            throw new Error(`Send notification failed: ${error.message}`);
        }
    }

    /**
     * Update notification
     */
    async updateNotification(id, data, adminId, req = null) {
        try {
            const oldData = await NotificationDAO.findById(id);
            if (!oldData) {
                throw new Error('Notification not found');
            }

            await NotificationDAO.update(id, data);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'UPDATE_NOTIFICATION',
                'notifications',
                id,
                oldData,
                data,
                req
            );

            return await NotificationDAO.findById(id);
        } catch (error) {
            throw new Error(`Update notification failed: ${error.message}`);
        }
    }

    /**
     * Delete notification
     */
    async deleteNotification(id, adminId, req = null) {
        try {
            const notification = await NotificationDAO.findById(id);
            if (!notification) {
                throw new Error('Notification not found');
            }

            await NotificationDAO.delete(id);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'DELETE_NOTIFICATION',
                'notifications',
                id,
                notification,
                null,
                req
            );

            return true;
        } catch (error) {
            throw new Error(`Delete notification failed: ${error.message}`);
        }
    }
}

module.exports = new NotificationService();
