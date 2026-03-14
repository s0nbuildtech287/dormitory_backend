/**
 * Script tạo fake data kỷ luật
 * - Lấy 10 sinh viên từ bảng users (role = STUDENT)
 * - Tạo đúng 1 phiếu/sinh viên = 10 phiếu tổng
 * - Không có tiền phạt, không có Buộc thôi ở
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

const LEVELS = ['Nhắc nhở', 'Cảnh cáo', 'Đình chỉ tạm thời'];
const STATUSES = ['Chờ xử lý', 'Đã xử lý', 'Đã xử lý'];

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

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function genId() { return `disc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; }
function randDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(1, daysAgo));
  return d;
}

async function run() {
  const client = await pool.connect();
  try {
    const usersRes = await client.query(
      `SELECT id, full_name FROM users WHERE role = 'STUDENT' LIMIT 10`
    );
    const students = usersRes.rows;
    if (students.length === 0) {
      console.log('Không tìm thấy sinh viên nào.');
      return;
    }

    const adminRes = await client.query(`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`);
    const adminId = adminRes.rows[0]?.id || null;

    const contractsRes = await client.query(
      `SELECT user_id, id AS contract_id, room_id FROM student_contracts WHERE status = 'Active'`
    );
    const contractMap = {};
    contractsRes.rows.forEach(c => { contractMap[c.user_id] = c; });

    const roomsRes = await client.query(`SELECT id FROM rooms LIMIT 20`);
    const rooms = roomsRes.rows;

    // Đảm bảo đa dạng loại vi phạm — shuffle VIOLATION_TYPES rồi lấy lần lượt
    const shuffledTypes = [...VIOLATION_TYPES].sort(() => Math.random() - 0.5);

    let count = 0;
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const vType = shuffledTypes[i % shuffledTypes.length];
      const level = rand(LEVELS);
      const status = rand(STATUSES);
      const scoreDeducted = CONF.levelScore?.[level] ?? (CONF.score?.[vType]?.default ?? 5);
      const contract = contractMap[student.id];
      const violationDate = randDate(180);
      const effectiveDate = new Date(violationDate);
      effectiveDate.setDate(effectiveDate.getDate() + 1);

      await client.query(`
        INSERT INTO disciplinary_records (
          id, user_id, room_id, contract_id,
          violation_type, violation_date, description,
          disciplinary_level, penalty_amount, penalty_paid,
          score_deducted, violation_count,
          email_sent, effective_date, status,
          reported_by, handled_by,
          created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW()
        )
      `, [
        genId(),
        student.id,
        contract?.room_id || (rooms.length ? rand(rooms).id : null),
        contract?.contract_id || null,
        vType,
        violationDate,
        rand(DESCRIPTIONS[vType]),
        level,
        0,           // penalty_amount = 0
        false,       // penalty_paid
        scoreDeducted,
        1,           // violation_count
        false,       // email_sent
        effectiveDate,
        status,
        adminId,
        status === 'Đã xử lý' ? adminId : null,
      ]);

      // Trừ conduct_score
      await client.query(
        `UPDATE users SET conduct_score = GREATEST(0, conduct_score - $1), updated_at = NOW() WHERE id = $2`,
        [scoreDeducted, student.id]
      );

      console.log(`  [${i + 1}] ${student.full_name} — ${vType} (${level}) → -${scoreDeducted} điểm`);
      count++;
    }

    console.log(`\n✅ Đã tạo ${count} phiếu vi phạm cho ${students.length} sinh viên`);
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
