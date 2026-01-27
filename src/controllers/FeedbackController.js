const FeedbackService = require('../services/FeedbackService');

class FeedbackController {
    /**
     * Get all feedbacks
     */
    async getAll(req, res, next) {
        try {
            const filters = {
                status: req.query.status,
                category: req.query.category,
                sentiment: req.query.sentiment,
                searchTerm: req.query.search,
                limit: req.query.limit ? parseInt(req.query.limit) : null
            };

            const feedbacks = await FeedbackService.getFeedbacks(filters);
            res.json({
                success: true,
                data: feedbacks
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get feedback by ID
     */
    async getById(req, res, next) {
        try {
            const feedback = await FeedbackService.getFeedbackById(req.params.id);
            res.json({
                success: true,
                data: feedback
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create new feedback
     */
    async create(req, res, next) {
        try {
            const feedback = await FeedbackService.createFeedback(req.body, req.user.userId, req);
            res.status(201).json({
                success: true,
                message: 'Feedback created successfully',
                data: feedback
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update feedback
     */
    async update(req, res, next) {
        try {
            const feedback = await FeedbackService.updateFeedback(
                req.params.id,
                req.body,
                req.user.userId,
                req
            );
            res.json({
                success: true,
                message: 'Feedback updated successfully',
                data: feedback
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update feedback status (Admin only)
     */
    async updateStatus(req, res, next) {
        try {
            const { status, adminResponse } = req.body;

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Status is required'
                });
            }

            const feedback = await FeedbackService.updateFeedbackStatus(
                req.params.id,
                status,
                req.user.userId,
                adminResponse,
                req
            );
            res.json({
                success: true,
                message: 'Feedback status updated successfully',
                data: feedback
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete feedback
     */
    async delete(req, res, next) {
        try {
            await FeedbackService.deleteFeedback(req.params.id, req.user.userId, req);
            res.json({
                success: true,
                message: 'Feedback deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get feedbacks by user
     */
    async getByUser(req, res, next) {
        try {
            const userId = req.params.userId || req.user.userId;
            const feedbacks = await FeedbackService.getFeedbacksByUser(userId);
            res.json({
                success: true,
                data: feedbacks
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get statistics
     */
    async getStatistics(req, res, next) {
        try {
            const statistics = await FeedbackService.getStatistics();
            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get pending count
     */
    async getPendingCount(req, res, next) {
        try {
            const count = await FeedbackService.getPendingCount();
            res.json({
                success: true,
                data: { count }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new FeedbackController();
