/**
 * Script tạo 10 fake feedbacks cho sinh viên xu4ns0n@gmail.com
 * Chạy: node scripts/fake-student-feedbacks.js
 */

const pool = require('../src/config/database');

const FEEDBACKS = [
  {
    category: "Sửa chữa",
    content: "Vòi nước trong phòng tắm bị rỉ nước liên tục, gây lãng phí và ẩm ướt sàn nhà. Đã xảy ra từ khoảng 1 tuần nay, mong ban quản lý cử người đến sửa sớm.",
    status: "Resolved",
    sentiment: "Negative",
    admin_response: "Ban quản lý đã ghi nhận và cử thợ đến sửa chữa vào ngày 25/03/2026. Cảm ơn bạn đã phản ánh.",
    daysAgo: 15,
  },
  {
    category: "Vệ sinh",
    content: "Khu vực hành lang tầng 3 có mùi hôi khó chịu, thùng rác không được đổ thường xuyên. Đề nghị tăng tần suất vệ sinh hành lang.",
    status: "Resolved",
    sentiment: "Negative",
    admin_response: "Đã nhắc nhở đội vệ sinh tăng cường dọn dẹp hành lang tầng 3 mỗi ngày 2 lần. Xin lỗi vì sự bất tiện này.",
    daysAgo: 30,
  },
  {
    category: "Trang thiết bị",
    content: "Điều hòa phòng P305 không hoạt động, chỉ thổi gió mà không làm lạnh. Thời tiết nóng bức, rất khó chịu khi ngủ.",
    status: "Processing",
    sentiment: "Negative",
    admin_response: null,
    daysAgo: 5,
  },
  {
    category: "An ninh",
    content: "Camera an ninh ở góc hành lang tầng 3 gần phòng P308 bị hỏng, không ghi hình. Đề nghị kiểm tra và thay thế để đảm bảo an toàn.",
    status: "New",
    sentiment: "Neutral",
    admin_response: null,
    daysAgo: 2,
  },
  {
    category: "Sửa chữa",
    content: "Ổ khóa cửa phòng P305 bị kẹt, phải dùng lực mạnh mới mở được. Lo ngại trong trường hợp khẩn cấp sẽ không thoát ra được kịp thời.",
    status: "Resolved",
    sentiment: "Negative",
    admin_response: "Đã thay ổ khóa mới cho phòng P305 vào ngày 20/03/2026. Nếu còn vấn đề gì vui lòng liên hệ lại.",
    daysAgo: 20,
  },
  {
    category: "Vệ sinh",
    content: "Nhà vệ sinh chung tầng 3 thường xuyên thiếu giấy vệ sinh và xà phòng rửa tay. Mong ban quản lý bổ sung đầy đủ hơn.",
    status: "Resolved",
    sentiment: "Neutral",
    admin_response: "Đã bổ sung giấy vệ sinh và xà phòng. Sẽ kiểm tra định kỳ 2 lần/ngày để đảm bảo luôn đầy đủ.",
    daysAgo: 45,
  },
  {
    category: "Trang thiết bị",
    content: "Bóng đèn hành lang tầng 3 đoạn từ phòng P301 đến P310 bị cháy 3 bóng, đi lại ban đêm rất tối và nguy hiểm.",
    status: "Resolved",
    sentiment: "Negative",
    admin_response: "Đã thay toàn bộ bóng đèn hành lang tầng 3. Cảm ơn bạn đã thông báo kịp thời.",
    daysAgo: 60,
  },
  {
    category: "An ninh",
    content: "Cửa tầng 3 thường xuyên không đóng kín do lò xo cửa bị hỏng, người lạ có thể vào tự do. Đề nghị sửa chữa gấp.",
    status: "Processing",
    sentiment: "Negative",
    admin_response: null,
    daysAgo: 7,
  },
  {
    category: "Khác",
    content: "Wifi khu vực phòng P305 rất yếu, tốc độ chậm vào buổi tối từ 20h-23h. Ảnh hưởng nhiều đến việc học online. Mong được nâng cấp hoặc lắp thêm bộ phát.",
    status: "New",
    sentiment: "Negative",
    admin_response: null,
    daysAgo: 1,
  },
  {
    category: "Sửa chữa",
    content: "Cửa sổ phòng P305 bị bung bản lề, không đóng kín được. Khi trời mưa nước tạt vào ướt sàn và đồ đạc. Mong được sửa chữa sớm.",
    status: "New",
    sentiment: "Negative",
    admin_response: null,
    daysAgo: 3,
  },
];

async function run() {
  const client = await pool.connect();
  try {
    // Tìm user theo email
    const userRes = await client.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      ['xu4ns0n@gmail.com']
    );
    if (userRes.rows.length === 0) {
      console.error('❌ Không tìm thấy user xu4ns0n@gmail.com. Hãy seed users trước.');
      return;
    }
    const userId = userRes.rows[0].id;
    console.log(`✅ Tìm thấy user: ${userId}`);

    // Tìm room của user qua contract
    const roomRes = await client.query(
      `SELECT room_id FROM student_contracts WHERE user_id = $1 AND status = 'Active' LIMIT 1`,
      [userId]
    );
    const roomId = roomRes.rows[0]?.room_id || null;
    console.log(`📍 Room: ${roomId || 'không có'}`);

    // Tìm admin để gán resolved_by
    const adminRes = await client.query(
      `SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`
    );
    const adminId = adminRes.rows[0]?.id || null;

    // Xóa feedback fake cũ của user này
    await client.query(
      `DELETE FROM feedbacks WHERE user_id = $1 AND id LIKE 'fb-fake-%'`,
      [userId]
    );
    console.log('🗑️  Đã xóa feedback fake cũ');

    let count = 0;
    for (let i = 0; i < FEEDBACKS.length; i++) {
      const f = FEEDBACKS[i];
      const id = `fb-fake-${String(i + 1).padStart(3, '0')}`;
      const createdAt = new Date(Date.now() - f.daysAgo * 86400000);
      const resolvedAt = f.status === 'Resolved'
        ? new Date(createdAt.getTime() + 2 * 86400000)
        : null;

      await client.query(`
        INSERT INTO feedbacks (
          id, user_id, room_id, category, content,
          sentiment, status, admin_response,
          resolved_by, resolved_at, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
        ON CONFLICT (id) DO NOTHING
      `, [
        id,
        userId,
        roomId,
        f.category,
        f.content,
        f.sentiment,
        f.status,
        f.admin_response,
        f.status === 'Resolved' ? adminId : null,
        resolvedAt,
        createdAt,
      ]);

      console.log(`  [${id}] ${f.status.padEnd(12)} ${f.category.padEnd(16)} — ${f.content.substring(0, 50)}...`);
      count++;
    }

    console.log(`\n✅ Đã tạo ${count} feedbacks cho xu4ns0n@gmail.com`);
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
