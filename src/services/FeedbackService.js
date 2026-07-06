const FeedbackDAO = require('../dao/FeedbackDAO');
const LogSystemDAO = require('../dao/LogSystemDAO');
const NotificationDAO = require('../dao/NotificationDAO');
const { emitAdminAlert, emitNotification } = require('../socket.js');
const { analyzeFeedback } = require('./openaiService');

/**
 * Kiểm tra ngưỡng cảnh báo AI
 * @param {{ priority: string, sentiment: string, sentiment_score: number }} result
 * @returns {boolean}
 */
function shouldAlert(result) {
    return result.priority === 'High' ||
           (result.sentiment === 'Negative' && result.sentiment_score >= 0.8);
}

class FeedbackService {
    /**
     * Get all feedbacks with filters
     */
    async getFeedbacks(filters = {}) {
        try {
            return await FeedbackDAO.searchAndFilter(filters);
        } catch (error) {
            throw new Error(`Get feedbacks failed: ${error.message}`);
        }
    }

    /**
     * Get feedback by ID
     */
    async getFeedbackById(id) {
        try {
            const feedbacks = await FeedbackDAO.searchAndFilter({ limit: 1 });
            const feedback = feedbacks.find(fb => fb.id === id);
            if (!feedback) {
                throw new Error('Feedback not found');
            }
            return feedback;
        } catch (error) {
            throw new Error(`Get feedback failed: ${error.message}`);
        }
    }

    /**
     * Create new feedback
     */
    async createFeedback(data, userId, req = null) {
        try {
            const feedbackId = `feedback-${Date.now()}`;
            const feedback = await FeedbackDAO.create({
                id: feedbackId,
                ...data,
                user_id: userId,
                status: 'New'
            });

            // Log action
            await LogSystemDAO.log(
                userId,
                'CREATE_FEEDBACK',
                'feedbacks',
                feedbackId,
                null,
                feedback,
                req
            );

            // Notify admins real-time
            emitAdminAlert("new_feedback", {
                id:       feedbackId,
                category: data.category || 'Khác',
                content:  (data.content || '').substring(0, 100),
            });

            // Fire-and-forget AI analysis — không await, không block response sinh viên
            setImmediate(() => {
                analyzeFeedback(feedbackId, data.content)
                    .then(result => {
                        if (result) {
                            FeedbackDAO.updateAIResult(feedbackId, result);
                            // Kiểm tra emitHighPriorityAlert tại runtime (có thể được thêm sau)
                            const socketModule = require('../socket.js');
                            const alertFn = socketModule.emitHighPriorityAlert;
                            if (shouldAlert(result) && typeof alertFn === 'function') {
                                alertFn({ feedbackId, ...result });
                            }
                        }
                    })
                    .catch(err => console.error('[AI] analyzeFeedback error:', err.message));
            });

            return feedback;
        } catch (error) {
            throw new Error(`Create feedback failed: ${error.message}`);
        }
    }

    /**
     * Update feedback status
     */
    async updateFeedbackStatus(id, status, adminId, adminResponse = null, req = null) {
        try {
            const oldData = await FeedbackDAO.findById(id);
            if (!oldData) {
                throw new Error('Feedback not found');
            }

            await FeedbackDAO.updateStatus(id, status, adminId, adminResponse);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'UPDATE_FEEDBACK_STATUS',
                'feedbacks',
                id,
                { status: oldData.status },
                { status, admin_response: adminResponse },
                req
            );

            // Tạo thông báo DB và phát socket realtime về cho sinh viên gửi phản ánh
            try {
                const notifTitle = `Phản hồi về phản ánh của bạn`;
                const notifContent = `Phản ánh [${oldData.category || 'Khác'}] của bạn đã được cập nhật trạng thái sang "${status}". Phản hồi từ BQL: ${adminResponse || 'Không có'}`;
                const newNotif = await NotificationDAO.sendToSpecificUsers(
                    notifTitle,
                    notifContent,
                    'Thông báo chung',
                    [oldData.user_id],
                    adminId
                );

                // Phát qua socket
                emitNotification(newNotif);
            } catch (notifErr) {
                console.error('[Notification Alert] Không thể gửi thông báo phản hồi phản ánh:', notifErr.message);
            }

            return await FeedbackDAO.findById(id);
        } catch (error) {
            throw new Error(`Update feedback status failed: ${error.message}`);
        }
    }

    /**
     * Get feedbacks by user
     */
    async getFeedbacksByUser(userId) {
        try {
            return await FeedbackDAO.findByUserId(userId);
        } catch (error) {
            throw new Error(`Get user feedbacks failed: ${error.message}`);
        }
    }

    /**
     * Get feedback statistics
     */
    async getStatistics() {
        try {
            return await FeedbackDAO.getStatistics();
        } catch (error) {
            throw new Error(`Get statistics failed: ${error.message}`);
        }
    }

    /**
     * Get pending feedbacks count
     */
    async getPendingCount() {
        try {
            return await FeedbackDAO.getPendingCount();
        } catch (error) {
            throw new Error(`Get pending count failed: ${error.message}`);
        }
    }

    /**
     * Get AI statistics: sentiment distribution, top emotions, high priority unresolved
     */
    async getAIStatistics() {
        try {
            return await FeedbackDAO.getAIStatistics();
        } catch (error) {
            throw new Error(`Get AI statistics failed: ${error.message}`);
        }
    }

    /**
     * Update feedback
     */
    async updateFeedback(id, data, userId, req = null) {
        try {
            const oldData = await FeedbackDAO.findById(id);
            if (!oldData) {
                throw new Error('Feedback not found');
            }

            // Only allow user to update their own feedback
            if (oldData.user_id !== userId) {
                throw new Error('Unauthorized to update this feedback');
            }

            await FeedbackDAO.update(id, data);

            // Log action
            await LogSystemDAO.log(
                userId,
                'UPDATE_FEEDBACK',
                'feedbacks',
                id,
                oldData,
                data,
                req
            );

            return await FeedbackDAO.findById(id);
        } catch (error) {
            throw new Error(`Update feedback failed: ${error.message}`);
        }
    }

    /**
     * Delete feedback
     */
    async deleteFeedback(id, userId, req = null) {
        try {
            const feedback = await FeedbackDAO.findById(id);
            if (!feedback) {
                throw new Error('Feedback not found');
            }

            // Only allow user to delete their own feedback or admin
            const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(req.user.role);
            if (feedback.user_id !== userId && !isAdmin) {
                throw new Error('Unauthorized to delete this feedback');
            }

            await FeedbackDAO.delete(id);

            // Log action
            await LogSystemDAO.log(
                userId,
                'DELETE_FEEDBACK',
                'feedbacks',
                id,
                feedback,
                null,
                req
            );

            return true;
        } catch (error) {
            throw new Error(`Delete feedback failed: ${error.message}`);
        }
    }
}

module.exports = new FeedbackService();
