const BaseDAO = require('./BaseDAO');

class FeedbackDAO extends BaseDAO {
    constructor() {
        super('feedbacks');
    }

    // Tìm kiếm các phản ánh theo ID sinh viên
    async findByUserId(userId) {
        return this.findAll({ user_id: userId }, ['created_at DESC']);
    }

    // Tìm kiếm các phản ánh theo trạng thái xử lý
    async findByStatus(status) {
        return this.findAll({ status }, ['created_at DESC']);
    }

    // Tìm kiếm các phản ánh theo ID phòng
    async findByRoom(roomId) {
        return this.findAll({ room_id: roomId }, ['created_at DESC']);
    }

    // Tìm kiếm và lọc các phản ánh kèm thông tin sinh viên, phòng và người xử lý
    async searchAndFilter(filters = {}) {
        let query = `
            SELECT 
                f.*,
                u.full_name as student_name,
                u.email as student_email,
                rf.student_id as student_code,
                r.room_number,
                r.building,
                resolver.full_name as resolver_name
            FROM ${this.tableName} f
            LEFT JOIN users u ON f.user_id = u.id
            LEFT JOIN register_forms rf ON rf.student_email = u.email
            LEFT JOIN rooms r ON f.room_id = r.id
            LEFT JOIN users resolver ON f.resolved_by = resolver.id
            WHERE 1=1
        `;
        const values = [];
        let p = 1;

        if (filters.status) {
            query += ` AND f.status = $${p++}`;
            values.push(filters.status);
        }

        if (filters.category) {
            query += ` AND f.category = $${p++}`;
            values.push(filters.category);
        }

        if (filters.sentiment) {
            query += ` AND f.sentiment = $${p++}`;
            values.push(filters.sentiment);
        }

        if (filters.priority) {
            query += ` AND f.priority = $${p++}`;
            values.push(filters.priority);
        }

        if (filters.searchTerm) {
            query += ` AND (f.content ILIKE $${p} OR u.full_name ILIKE $${p} OR rf.student_id ILIKE $${p})`;
            values.push(`%${filters.searchTerm}%`);
            p++;
        }

        query += ` ORDER BY f.created_at DESC`;

        if (filters.limit) {
            query += ` LIMIT $${p++}`;
            values.push(filters.limit);
        }

        return this.executeQuery(query, values);
    }

    // Cập nhật trạng thái xử lý phản ánh kèm người xử lý và phản hồi của admin
    async updateStatus(feedbackId, status, resolvedBy = null, adminResponse = null) {
        const data = { status };
        
        if (status === 'Resolved') {
            data.resolved_by = resolvedBy;
            data.resolved_at = new Date();
            if (adminResponse) {
                data.admin_response = adminResponse;
            }
        }

        return this.update(feedbackId, data);
    }

    // Cập nhật kết quả phân tích sắc thái bằng AI (sentiment, độ ưu tiên, keywords...) cho phản ánh
    async updateAIResult(feedbackId, aiResult) {
        const query = `
            UPDATE ${this.tableName}
            SET
                sentiment = $1,
                sentiment_score = $2,
                priority = $3,
                ai_summary = $4,
                keywords = $5,
                emotion = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
        `;
        const values = [
            aiResult.sentiment,
            aiResult.sentiment_score,
            aiResult.priority,
            aiResult.ai_summary ?? aiResult.summary ?? null,
            aiResult.keywords,
            aiResult.emotion,
            feedbackId,
        ];
        const result = await this.executeQuery(query, values);
        return result;
    }

    // Lấy số liệu thống kê phân tích AI (tỷ lệ sắc thái, các cảm xúc phổ biến, các phản ánh ưu tiên chưa xử lý)
    async getAIStatistics() {
        const [sentimentDistribution, topEmotions, highPriorityUnresolved] = await Promise.all([
            this.executeQuery(
                `SELECT sentiment, COUNT(*) as count
                 FROM ${this.tableName}
                 WHERE sentiment IS NOT NULL
                 GROUP BY sentiment`,
                []
            ),
            this.executeQuery(
                `SELECT emotion, COUNT(*) as count
                 FROM ${this.tableName}
                 WHERE emotion IS NOT NULL
                 GROUP BY emotion
                 ORDER BY count DESC
                 LIMIT 5`,
                []
            ),
            this.executeQuery(
                `SELECT *
                 FROM ${this.tableName}
                 WHERE priority = 'High' AND status = 'New'
                 ORDER BY created_at DESC
                 LIMIT 10`,
                []
            ),
        ]);

        return { sentimentDistribution, topEmotions, highPriorityUnresolved };
    }

    // Thống kê phản ánh theo trạng thái, danh mục và sắc thái cảm xúc
    async getStatistics() {
        const query = `
            SELECT 
                status,
                category,
                sentiment,
                COUNT(*) as count,
                COUNT(CASE WHEN status = 'New' THEN 1 END) as new_count,
                COUNT(CASE WHEN status = 'Processing' THEN 1 END) as processing_count,
                COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved_count
            FROM ${this.tableName}
            GROUP BY status, category, sentiment
            ORDER BY count DESC
        `;
        return this.executeQuery(query, []);
    }

    // Đếm số lượng phản ánh mới nhận (chưa xử lý)
    async getPendingCount() {
        return this.count({ status: 'New' });
    }
}

module.exports = new FeedbackDAO();
