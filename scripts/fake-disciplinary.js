/**
 * Script tạo fake data kỷ luật
 * - Lấy 10 sinh viên từ bảng users (role = STUDENT)
 * - Tạo các phiếu vi phạm đa dạng (không ai bị Buộc thôi ở)
 * - Trừ conduct_score tương ứng
 *
 * Chạy: node scripts/fake-disciplinary.js
 */

const pool = require('../src/config/database');
const CONF = require('../src/config/disciplinaryConfig');

const VIOLATION_TYPES = [
  'Vi phạm nội quy',
  'Gây mất trật tự',
  'Hư hại tài sản',
  'Vệ sinh kém',
  'Trốn phòng',
  'Nộp tiền trễ',
  'Sử dụng điện sai quy định',
  'Khác',
];

// Dữ liệu mẫu không bao gồm Buộc thôi ở (vẫn tồn tại trong hệ thống)
const LEVELS = ['Nhắc nhở', 'Cảnh cáo', 'Phạt tiền', 'Đình chỉ tạm thời'];
const STATUSES = ['Chờ xử lý', 'Đã xử lý', 'Đã xử lý', 'Đã xử lý']; // xác suất đã xử lý cao hơn

const DESCRIPTIONS = {
  'Vi phạm nội quy':           ['Để khách ở qua đêm không đăng ký', 'Ra vào ngoài giờ quy định nhiều lần', 'Không ký xác nhận nội quy khi nhận phòng'],
  'Gây mất trật tự':           ['Gây ồn ào sau 22h, ảnh hưởng phòng bên cạnh', 'Tổ chức tụ tập đông người trong phòng', 'Mở nhạc to sau giờ giới nghiêm'],
  'Hư hại tài sản':            ['Làm vỡ gương tủ quần áo', 'Làm hỏng ổ khóa cửa phòng', 'Làm hỏng quạt trần do sử dụng sai cách'],
  'Vệ sinh kém':               ['Phòng không dọn dẹp trong 2 tuần liên tiếp', 'Để rác trong phòng không đổ', 'Không vệ sinh nhà vệ sinh chung'],
  'Trốn phòng':                ['Cho bạn bè ở chung không đăng ký', 'Cho người ngoài mượn thẻ ra vào', 'Ở chung với sinh viên phòng khác'],
  'Nộp tiền trễ':              ['Chậm thanh toán hóa đơn tháng 10 quá 15 ngày', 'Nộp tiền phòng trễ hạn 3 tuần', 'Chưa thanh toán tiền điện nước tháng 9'],
  'Sử dụng điện sai quy định': ['Sử dụng bếp điện trong phòng', 'Dùng nồi cơm điện vi phạm quy định', 'Sử dụng máy sấy tóc công suất cao'],
  'Khác':                      ['Vi phạm quy định để xe', 'Hút thuốc trong khu vực cấm', 'Không hợp tác kiểm tra phòng định kỳ'],
};

const PENALTY_MAP = {
  'Vi phạm nội quy':           0,
  'Gây mất trật tự':           100000,
  'Hư hại tài sản':            500000,
  'Vệ sinh kém':               0,
  'Trốn phòng':                500000,
  'Nộp tiền trễ':              0,
  'Sử dụng điện sai quy định': 300000,
  'Khác':                      50000,
};

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function genId() { return `disc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; }

function randDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, daysAgo));
  return d;
}

async function run() {
  const client = await pool.connect();
  try {
    // Lấy 10 sinh viên
    const usersRes = await client.query(
      `SELECT id, full_name FROM users WHERE role = 'STUDENT' LIMIT 10`
    );
    const students = usersRes.rows;
    if (students.length === 0) {
      console.log('Không tìm thấy sinh viên nào. Hãy chạy fake-student-contracts.js trước.');
      return;
    }

    // Lấy admin để làm reported_by / handled_by
    const adminRes = await client.query(`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`);
    const adminId = adminRes.rows[0]?.id || null;

    // Lấy danh sách phòng
    const roomsRes = await client.query(`SELECT id FROM rooms LIMIT 20`);
    const rooms = roomsRes.rows;

    // Lấy hợp đồng active của từng sinh viên
    const contractsRes = await client.query(
      `SELECT user_id, id AS contract_id, room_id FROM student_contracts WHERE status = 'Active'`
    );
    const contractMap = {};
    contractsRes.rows.forEach(c => { contractMap[c.user_id] = c; });

    let totalRecords = 0;
    const scoreDeductions = {}; // user_id → tổng điểm trừ

    // Mỗi sinh viên có 1-4 vi phạm, đa dạng loại và mức
    for (const student of students) {
      const numViolations = randInt(1, 4);
      const violationCountByType = {};

      for (let v = 0; v < numViolations; v++) {
        const vType = rand(VIOLATION_TYPES);
        violationCountByType[vType] = (violationCountByType[vType] || 0) + 1;
        const vCount = violationCountByType[vType];

        // Level tăng dần nếu tái phạm
        const levelIdx = Math.min(vCount - 1, LEVELS.length - 1);
        const level = LEVELS[levelIdx];

        const cfgEntry = CONF.score[vType] || CONF.score['Khác'];
        const scoreDeducted = CONF.levelScore[level] || cfgEntry.default;
        const penalty = level === 'Phạt tiền' ? PENALTY_MAP[vType] : 0;
        const status = rand(STATUSES);
        const emailSent = vCount >= CONF.emailThreshold;
        const contract = contractMap[student.id];

        const id = genId();
        const violationDate = randDate(180);
        const effectiveDate = new Date(violationDate);
        effectiveDate.setDate(effectiveDate.getDate() + 1);

        await client.query(`
          INSERT INTO disciplinary_records (
            id, user_id, room_id, contract_id,
            violation_type, violation_date, description,
            disciplinary_level, penalty_amount, penalty_paid,
            score_deducted, violation_count,
            email_sent, email_sent_at,
            effective_date, status,
            reported_by, handled_by,
            created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW(),NOW()
          )
        `, [
          id,
          student.id,
          contract?.room_id || (rooms.length ? rand(rooms).id : null),
          contract?.contract_id || null,
          vType,
          violationDate,
          rand(DESCRIPTIONS[vType]),
          level,
          penalty,
          penalty > 0 && status === 'Đã xử lý' ? true : false,
          scoreDeducted,
          vCount,
          emailSent,
          emailSent ? violationDate : null,
          effectiveDate,
          status,
          adminId,
          status === 'Đã xử lý' ? adminId : null,
        ]);

        scoreDeductions[student.id] = (scoreDeductions[student.id] || 0) + scoreDeducted;
        totalRecords++;
      }
    }

    // Cập nhật conduct_score cho từng sinh viên
    for (const [userId, totalDeducted] of Object.entries(scoreDeductions)) {
      await client.query(
        `UPDATE users SET conduct_score = GREATEST(0, 100 - $1), updated_at = NOW() WHERE id = $2`,
        [totalDeducted, userId]
      );
    }

    console.log(`✅ Đã tạo ${totalRecords} phiếu vi phạm cho ${students.length} sinh viên`);
    console.log('📊 Điểm trừ theo sinh viên:');
    for (const [userId, deducted] of Object.entries(scoreDeductions)) {
      const sv = students.find(s => s.id === userId);
      console.log(`   ${sv?.full_name || userId}: -${deducted} điểm → còn ${Math.max(0, 100 - deducted)} điểm`);
    }
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
