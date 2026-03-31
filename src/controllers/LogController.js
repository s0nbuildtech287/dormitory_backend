const LogSystemDAO = require('../dao/LogSystemDAO');

class LogController {
    /**
     * Get recent activity logs
     */
    async getRecentActivity(req, res, next) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 50;
            const logs = await LogSystemDAO.getRecentActivity(limit);
            res.json({
                success: true,
                data: logs
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get activity logs with filters + pagination
     */
    async getActivityLogs(req, res, next) {
        try {
            const page  = req.query.page  ? parseInt(req.query.page)  : 1;
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;
            const offset = (page - 1) * limit;

            const filters = {
                userId:     req.query.userId,
                action:     req.query.action,
                entityType: req.query.entityType,
                startDate:  req.query.startDate,
                endDate:    req.query.endDate,
                search:     req.query.search,
                limit,
                offset,
            };

            const { rows, total } = await LogSystemDAO.getActivityLogs(filters);
            res.json({
                success: true,
                data: rows,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get logs by user
     */
    async getByUser(req, res, next) {
        try {
            const userId = req.params.userId || req.user.userId;
            const limit = req.query.limit ? parseInt(req.query.limit) : 50;
            const logs = await LogSystemDAO.getByUser(userId, limit);
            res.json({
                success: true,
                data: logs
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get logs by entity
     */
    async getByEntity(req, res, next) {
        try {
            const { entityType, entityId } = req.params;
            const limit = req.query.limit ? parseInt(req.query.limit) : 50;
            const logs = await LogSystemDAO.getByEntity(entityType, entityId, limit);
            res.json({
                success: true,
                data: logs
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get action statistics
     */
    async getActionStatistics(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Start date and end date are required'
                });
            }

            const statistics = await LogSystemDAO.getActionStatistics(startDate, endDate);
            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Clean old logs (Admin only)
     */
    async cleanOldLogs(req, res, next) {
        try {
            const days = req.query.days ? parseInt(req.query.days) : 90;
            const count = await LogSystemDAO.cleanOldLogs(days);
            res.json({
                success: true,
                message: `Cleaned ${count} old log(s)`,
                data: { deleted: count }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new LogController();
