const NotificationService = require('../services/NotificationService');

class NotificationController {
    /**
     * Get all notifications
     */
    async getAll(req, res, next) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : null;
            const notifications = await NotificationService.getNotifications(limit);
            res.json({
                success: true,
                data: notifications
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get notifications for current user
     */
    async getForUser(req, res, next) {
        try {
            const notifications = await NotificationService.getNotificationsForUser(req.user.userId);
            res.json({
                success: true,
                data: notifications
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get notification by ID
     */
    async getById(req, res, next) {
        try {
            const notification = await NotificationService.getNotificationById(req.params.id);
            res.json({
                success: true,
                data: notification
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create new notification
     */
    async create(req, res, next) {
        try {
            const notification = await NotificationService.createNotification(
                req.body,
                req.user.userId,
                req
            );
            res.status(201).json({
                success: true,
                message: 'Notification created successfully',
                data: notification
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Send notification to all students
     */
    async sendToAllStudents(req, res, next) {
        try {
            const { title, content, type } = req.body;

            if (!title || !content) {
                return res.status(400).json({
                    success: false,
                    message: 'Title and content are required'
                });
            }

            const notification = await NotificationService.sendToAllStudents(
                title,
                content,
                type || 'Thông báo chung',
                req.user.userId,
                req
            );
            res.status(201).json({
                success: true,
                message: 'Notification sent to all students successfully',
                data: notification
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Send notification to specific users
     */
    async sendToSpecificUsers(req, res, next) {
        try {
            const { title, content, type, userIds } = req.body;

            if (!title || !content || !userIds || !Array.isArray(userIds)) {
                return res.status(400).json({
                    success: false,
                    message: 'Title, content, and userIds array are required'
                });
            }

            const notification = await NotificationService.sendToSpecificUsers(
                title,
                content,
                type || 'Thông báo chung',
                userIds,
                req.user.userId,
                req
            );
            res.status(201).json({
                success: true,
                message: 'Notification sent successfully',
                data: notification
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update notification
     */
    async update(req, res, next) {
        try {
            const notification = await NotificationService.updateNotification(
                req.params.id,
                req.body,
                req.user.userId,
                req
            );
            res.json({
                success: true,
                message: 'Notification updated successfully',
                data: notification
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete notification
     */
    async delete(req, res, next) {
        try {
            await NotificationService.deleteNotification(req.params.id, req.user.userId, req);
            res.json({
                success: true,
                message: 'Notification deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new NotificationController();
