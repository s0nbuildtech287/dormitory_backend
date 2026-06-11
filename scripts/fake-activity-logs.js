/**
 * Script tạo 20 fake activity logs vào bảng log_system
 * Chạy: node scripts/fake-activity-logs.js
 */

const pool = require('../src/config/database');

const LOGS = [
  { action: "APPROVE_REGISTRATION",  entity_type: "register_forms",      entity_id: "RF2024001", detail: "Phê duyệt hồ sơ đăng ký của sinh viên Trần Thị Bình (SV2024001)",                              ip: "192.168.1.10", minsAgo: 560 },
  { action: "CREATE_INVOICE",         entity_type: "invoices",             entity_id: "HD2026031", detail: "Tạo hóa đơn tháng 3/2026 cho phòng P301 - Tổng 1.250.000 VNĐ",                                ip: "192.168.1.11", minsAgo: 525 },
  { action: "REJECT_REGISTRATION",    entity_type: "register_forms",       entity_id: "RF2024045", detail: "Từ chối hồ sơ đăng ký của sinh viên Phạm Văn Cường (SV2024045) - Không đủ điều kiện ưu tiên", ip: "192.168.1.10", minsAgo: 500 },
  { action: "UPDATE_ROOM",            entity_type: "rooms",                entity_id: "P301",      detail: "Cập nhật phòng P301 - Thay đổi sức chứa từ 4 lên 6 người",                                    ip: "192.168.1.12", minsAgo: 480 },
  { action: "CREATE_NOTIFICATION",    entity_type: "notifications",        entity_id: "NTF2026031",detail: "Gửi thông báo nhắc nhở đóng tiền phòng tháng 3 đến toàn bộ sinh viên",                        ip: "192.168.1.11", minsAgo: 450 },
  { action: "RESOLVE_FEEDBACK",       entity_type: "feedbacks",            entity_id: "FB2026031", detail: "Xử lý và đóng phản ánh #FB2026031 - Sửa chữa điều hòa phòng P205",                           ip: "192.168.1.12", minsAgo: 428 },
  { action: "CREATE_CONTRACT",        entity_type: "student_contracts",    entity_id: "HD2026007", detail: "Tạo hợp đồng mới cho sinh viên Ngô Thị Dung - Phòng P402, kỳ 2026-2027",                     ip: "192.168.1.10", minsAgo: 385 },
  { action: "CREATE_DISCIPLINARY",    entity_type: "disciplinary_records", entity_id: "KL2026008", detail: "Lập phiếu kỷ luật cho sinh viên Lê Văn Em (SV2023112) - Vi phạm nội quy, về muộn giờ quy định",ip: "192.168.1.13", minsAgo: 350 },
  { action: "UPDATE_INVOICE",         entity_type: "invoices",             entity_id: "HD2026031", detail: "Cập nhật trạng thái hóa đơn HD2026031 sang Đã thanh toán - Thu tiền mặt",                    ip: "192.168.1.11", minsAgo: 285 },
  { action: "CREATE_ROOM",            entity_type: "rooms",                entity_id: "P501",      detail: "Thêm phòng mới P501, P502, P503 vào hệ thống - Tầng 5 khu B",                                 ip: "192.168.1.12", minsAgo: 250 },
  { action: "APPROVE_REGISTRATION",   entity_type: "register_forms",       entity_id: "RF2024089", detail: "Phê duyệt hồ sơ đăng ký của sinh viên Hoàng Văn Phúc (SV2024089)",                            ip: "192.168.1.10", minsAgo: 230 },
  { action: "CREATE_NOTIFICATION",    entity_type: "notifications",        entity_id: "NTF2026032",detail: "Gửi thông báo lịch kiểm tra phòng định kỳ tháng 4 đến toàn bộ sinh viên",                    ip: "192.168.1.13", minsAgo: 205 },
  { action: "DELETE_REGISTRATION",    entity_type: "register_forms",       entity_id: "RF2024102", detail: "Xóa hồ sơ đăng ký trùng lặp của sinh viên Vũ Thị Giang (SV2024102)",                         ip: "192.168.1.11", minsAgo: 180 },
  { action: "UPDATE_CONTRACT",        entity_type: "student_contracts",    entity_id: "HD2026014", detail: "Gia hạn hợp đồng cho 15 sinh viên hết hạn vào tháng 4/2026",                                  ip: "192.168.1.12", minsAgo: 160 },
  { action: "RESOLVE_FEEDBACK",       entity_type: "feedbacks",            entity_id: "FB2026028", detail: "Xử lý phản ánh #FB2026028 - Thay bóng đèn hành lang tầng 2",                                  ip: "192.168.1.10", minsAgo: 135 },
  { action: "UPDATE_USER",            entity_type: "users",                entity_id: "USR011",    detail: "Cập nhật thông tin tài khoản admin Lê Thị Hoa - Đổi số điện thoại liên hệ",                   ip: "192.168.1.13", minsAgo: 120 },
  { action: "CREATE_INVOICE",         entity_type: "invoices",             entity_id: "HD2026017", detail: "Tạo hóa đơn dịch vụ internet tháng 3/2026 cho 120 phòng",                                     ip: "192.168.1.11", minsAgo: 100 },
  { action: "UPDATE_FEEDBACK",        entity_type: "feedbacks",            entity_id: "FB2026035", detail: "Đóng phản ánh #FB2026035 - Không đủ cơ sở xử lý, yêu cầu bổ sung thông tin",                 ip: "192.168.1.12", minsAgo: 70  },
  { action: "UPDATE_DISCIPLINARY",    entity_type: "disciplinary_records", entity_id: "KL2026019", detail: "Nâng mức kỷ luật lên Cảnh cáo cho sinh viên Đinh Văn Hải (SV2022078) - Tái phạm lần 2",      ip: "192.168.1.10", minsAgo: 50  },
  { action: "CREATE_NOTIFICATION",    entity_type: "notifications",        entity_id: "NTF2026033",detail: "Gửi thông báo kết quả xét duyệt đợt 1 tháng 4 đến 45 sinh viên đăng ký",                     ip: "192.168.1.13", minsAgo: 30  },
];

async function run() {
  const client = await pool.connect();
  try {
    // Lấy danh sách admin để gán user_id
    const adminRes = await client.query(`SELECT id, full_name FROM users WHERE role != 'STUDENT' ORDER BY created_at LIMIT 4`);
    const admins = adminRes.rows;

    if (admins.length === 0) {
      console.error('❌ Không tìm thấy admin nào trong DB. Hãy seed users trước.');
      return;
    }

    // Xóa log fake cũ nếu có
    await client.query(`DELETE FROM log_system WHERE id LIKE 'log-fake-%'`);
    console.log('🗑️  Đã xóa log fake cũ');

    let count = 0;
    for (let i = 0; i < LOGS.length; i++) {
      const l = LOGS[i];
      const admin = admins[i % admins.length];
      const createdAt = new Date(Date.now() - l.minsAgo * 60 * 1000);
      const id = `log-fake-${String(i + 1).padStart(3, '0')}`;

      await client.query(`
        INSERT INTO log_system (id, user_id, action, entity_type, entity_id, new_value, ip_address, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [
        id,
        admin.id,
        l.action,
        l.entity_type,
        l.entity_id,
        JSON.stringify({ detail: l.detail }),
        l.ip,
        createdAt,
      ]);

      console.log(`  [${id}] ${l.action.padEnd(28)} — ${admin.full_name}`);
      count++;
    }

    console.log(`\n✅ Đã seed ${count} activity logs thành công`);
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
