const DisciplinaryService = require('../services/DisciplinaryService');

class DisciplinaryController {
  async getAll(req, res, next) {
    try {
      const filters = {
        user_id:           req.query.user_id,
        status:            req.query.status,
        violation_type:    req.query.violation_type,
        disciplinary_level:req.query.disciplinary_level,
        date_from:         req.query.date_from,
        date_to:           req.query.date_to,
        search:            req.query.search,
      };
      const data = await DisciplinaryService.getAll(filters);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const data = await DisciplinaryService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const data = await DisciplinaryService.create(req.body, req.user.userId);
      res.status(201).json({ success: true, message: 'Tạo phiếu kỷ luật thành công', data });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const data = await DisciplinaryService.update(req.params.id, req.body);
      res.json({ success: true, message: 'Cập nhật thành công', data });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await DisciplinaryService.delete(req.params.id);
      res.json({ success: true, message: 'Đã xóa phiếu kỷ luật' });
    } catch (err) { next(err); }
  }

  async getStatistics(req, res, next) {
    try {
      const data = await DisciplinaryService.getStatistics();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async getScoreConfig(req, res, next) {
    try {
      const data = await DisciplinaryService.getScoreConfig();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async saveScoreConfig(req, res, next) {
    try {
      const data = await DisciplinaryService.saveScoreConfig(req.body, req.user.userId);
      res.json({ success: true, message: 'Đã lưu cấu hình điểm trừ', data });
    } catch (err) { next(err); }
  }
}

module.exports = new DisciplinaryController();
