const DisciplinaryDAO = require('../dao/DisciplinaryDAO');
const DEFAULT_CONFIG = require('../config/disciplinaryConfig');

class DisciplinaryService {
  _id() {
    return `disc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /** Lấy config điểm trừ: ưu tiên DB (admin đã chỉnh), fallback về file config */
  async getEffectiveConfig() {
    const dbConfig = await DisciplinaryDAO.getScoreConfig();
    return dbConfig || DEFAULT_CONFIG.score;
  }

  async getAll(filters) {
    return DisciplinaryDAO.findAll(filters);
  }

  async getById(id) {
    const record = await DisciplinaryDAO.findById(id);
    if (!record) throw new Error('Không tìm thấy phiếu kỷ luật');
    return record;
  }

  async create(body, reportedBy) {
    const config = await this.getEffectiveConfig();

    // Tính violation_count
    const prevCount = await DisciplinaryDAO.countByUserAndType(body.user_id, body.violation_type);
    const violationCount = prevCount + 1;

    // Tính score_deducted: dùng giá trị admin nhập nếu có, không thì lấy default config
    const cfgEntry = config[body.violation_type] || config['Khác'];
    let scoreDeducted = body.score_deducted != null
      ? Number(body.score_deducted)
      : cfgEntry.default;

    // Buộc thôi ở → không trừ điểm
    if (body.disciplinary_level === 'Buộc thôi ở') scoreDeducted = 0;

    // Gửi email nếu đạt ngưỡng
    const emailSent = violationCount >= DEFAULT_CONFIG.emailThreshold;

    const record = await DisciplinaryDAO.create({
      id: this._id(),
      ...body,
      score_deducted: scoreDeducted,
      violation_count: violationCount,
      email_sent: emailSent,
      email_sent_at: emailSent ? new Date() : null,
      reported_by: reportedBy,
    });

    return record;
  }

  async update(id, body) {
    await this.getById(id);
    return DisciplinaryDAO.update(id, body);
  }

  async delete(id) {
    await this.getById(id);
    return DisciplinaryDAO.delete(id);
  }

  async getStatistics() {
    return DisciplinaryDAO.getStatistics();
  }

  async getScoreConfig() {
    return this.getEffectiveConfig();
  }

  async saveScoreConfig(config, userId) {
    return DisciplinaryDAO.saveScoreConfig(config, userId);
  }
}

module.exports = new DisciplinaryService();
