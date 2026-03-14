/**
 * Cấu hình điểm trừ rèn luyện theo loại vi phạm
 * - default: điểm trừ mặc định khi lập phiếu
 * - min/max: khoảng admin có thể override
 * - penalty: tiền phạt mặc định (VNĐ), 0 = không phạt tiền
 * - emailThreshold: gửi email cảnh báo khi vi phạm >= N lần (cùng loại, cùng SV)
 *
 * Nguồn: Bảng quy định KTX (DisciplineRegulations)
 */

const DISCIPLINARY_CONFIG = {
  score: {
    'Vi phạm nội quy':           { default: 5,  min: 2,  max: 15, penalty: 0 },
    'Gây mất trật tự':           { default: 3,  min: 2,  max: 10, penalty: 100000 },
    'Hư hại tài sản':            { default: 10, min: 5,  max: 20, penalty: 0 },   // penalty tính theo % giá trị tài sản
    'Vệ sinh kém':               { default: 3,  min: 2,  max: 5,  penalty: 0 },
    'Trốn phòng':                { default: 10, min: 5,  max: 15, penalty: 500000 },
    'Nộp tiền trễ':              { default: 5,  min: 2,  max: 10, penalty: 0 },   // penalty = 0.1%/ngày tính riêng
    'Sử dụng điện sai quy định': { default: 8,  min: 5,  max: 15, penalty: 200000 },
    'Khác':                      { default: 3,  min: 1,  max: 10, penalty: 0 },
  },

  // Điểm trừ theo mức kỷ luật (dùng khi override theo level thay vì violation_type)
  levelScore: {
    'Nhắc nhở':          2,
    'Cảnh cáo':          5,
    'Phạt tiền':         10,
    'Đình chỉ tạm thời': 20,
    'Buộc thôi ở':       0,  // Terminate contract, không trừ điểm
  },

  // Gửi email cảnh báo khi vi phạm >= ngưỡng này (cùng violation_type + user_id)
  emailThreshold: 3,

  // Điểm tối thiểu trước khi bị xem xét đình chỉ
  suspendThreshold: 40,

  // Điểm tối thiểu trước khi bị xem xét buộc thôi ở
  expelThreshold: 20,
};

module.exports = DISCIPLINARY_CONFIG;
