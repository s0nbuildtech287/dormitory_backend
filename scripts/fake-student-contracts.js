const pool = require("../src/config/database");
const bcrypt = require("bcryptjs");

// Danh sách tên Việt Nam
const firstNames = {
  male: ["Văn", "Đức", "Minh", "Hoàng", "Quang", "Tuấn", "Hải", "Anh", "Duy", "Khoa", "Thành", "Long", "Nam", "Phong", "Tùng", "Hùng", "Bảo", "Trung", "Sơn", "Tân"],
  female: ["Thị", "Hồng", "Thu", "Lan", "Hương", "Mai", "Linh", "Nga", "Phương", "Trang", "Hà", "Nhung", "Thảo", "Vy", "Anh", "Ngọc", "Diệu", "Thanh", "Huyền", "My"]
};

const lastNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const middleNames = ["Văn", "Thị", "Đức", "Hữu", "Công", "Minh", "Thanh", "Quốc", "Xuân", "Bảo", "Ngọc", "Thúy", "Kim", "Phương"];

const faculties = [
  "Công nghệ thông tin", "Kinh tế", "Ngoại ngữ", "Kỹ thuật", "Y Dược",
  "Luật", "Sư phạm", "Khoa học tự nhiên", "Xây dựng", "Điện - Điện tử"
];

const provinces = [
  "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Nghệ An", "Thanh Hóa",
  "Lào Cai", "Gia Lai", "Hưng Yên", "Nam Định"
];

// Lý do ưu tiên từ file CSV thực tế
const priorityReasons = [
  "Hộ nghèo cận nghèo",
  "Vùng sâu vùng xa",
  "Con thương binh, liệt sỹ",
  "Sinh viên khuyết tật",
  "Lưu học sinh (Lào/Campuchia)"
];

function generateName(gender) {
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
  const firstName = gender === "Nam" 
    ? firstNames.male[Math.floor(Math.random() * firstNames.male.length)]
    : firstNames.female[Math.floor(Math.random() * firstNames.female.length)];
  
  return `${lastName} ${middleName} ${firstName}`;
}

function generateEmail(name, studentId) {
  const nameParts = name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .split(" ");
  
  const firstName = nameParts[nameParts.length - 1];
  const lastNameInitial = nameParts[0].charAt(0);
  
  return `${firstName}${lastNameInitial}${studentId.slice(-4)}@student.edu.vn`;
}

function generatePhone() {
  const prefixes = ["032", "033", "034", "035", "036", "037", "038", "039"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
  return `${prefix}${number}`;
}

function generateCCCD() {
  return Math.floor(Math.random() * 900000000000 + 100000000000).toString();
}

async function generateFakeStudentContracts() {
  try {
    console.log("🚀 Bắt đầu tạo fake data cho 1000 hồ sơ đăng ký + hợp đồng sinh viên + tài khoản...");



    // Lấy danh sách 200 phòng đầu tiên
    const roomsResult = await pool.query(`
      SELECT id, room_number, building, floor, gender_type, rent_price, capacity
      FROM rooms
      ORDER BY id
      LIMIT 200
    `);
    
    const rooms = roomsResult.rows;
    if (rooms.length === 0) {
      throw new Error("Không tìm thấy phòng nào. Vui lòng chạy fake-rooms.js trước!");
    }
    
    console.log(`📦 Đã tìm thấy ${rooms.length} phòng để gán hợp đồng`);

    const registerForms = [];
    const users = [];
    const contracts = [];
    const timestamp = Date.now();
    
    // Phân bổ theo 3 rổ: Rổ 1 (10%) = 100, Rổ 2 (60%) = 600, Rổ 3 (30%) = 300
    const basket1Count = 100; // Chính sách
    const basket2Count = 599; // Tân sinh viên (năm 1) — giảm 1 để nhường chỗ cho SV đặc cách
    const basket3Count = 300; // Khóa cũ (năm 2,3,4)
    
    // Phân bổ theo thời gian tạo hồ sơ
    const timeGroup1Count = 50;  // Đã hết hạn (7 tháng trước)
    const timeGroup2Count = 800; // 3 tháng trước (còn 3 tháng)
    const timeGroup3Count = 150; // 1 tháng trước (còn 5 tháng - mới)
    
    let userIndex = 0;
    let roomIndex = 0;
    let studentsInCurrentRoom = 0;
    const maxStudentsPerRoom = 5;
    let currentTimeGroup = 1;
    let countInCurrentTimeGroup = 0;
    
    // Hàm tính điểm AI
    function calculateAIScore(year, gpa, priorityReason) {
      const weights = { w1_priority: 0.25, w2_year: 0.35, w3_gpa: 0.4 };
      
      // Priority Score
      let priorityScore = 0;
      if (priorityReason) {
        const lower = priorityReason.toLowerCase();
        if (lower.includes("hộ nghèo") || lower.includes("cận nghèo") || 
            lower.includes("thương binh") || lower.includes("liệt sỹ") || 
            lower.includes("khuyết tật") || lower.includes("lưu học sinh")) {
          priorityScore = 100;
        } else if (lower.includes("vùng sâu") || lower.includes("vùng xa")) {
          priorityScore = 70;
        } else {
          priorityScore = 30;
        }
      }
      
      // Year Score
      const yearScores = { 1: 100, 2: 60, 3: 40, 4: 20 };
      const yearScore = yearScores[year] || 0;
      
      // GPA Score
      const gpaScore = year === 1 && parseFloat(gpa) === 0 ? 50 : parseFloat(gpa) * 25;
      
      // Total Score
      const totalScore = Math.round(
        priorityScore * weights.w1_priority +
        yearScore * weights.w2_year +
        gpaScore * weights.w3_gpa
      );
      
      // AI Suggestion
      let aiSuggestion = "Không ưu tiên";
      if (totalScore >= 70) aiSuggestion = "Nên duyệt";
      else if (totalScore >= 50) aiSuggestion = "Cân nhắc";
      
      return { aiScore: totalScore, aiSuggestion };
    }
    
    // Hàm tạo sinh viên
    function createStudent(basket, index) {
      userIndex++;
      
      // Xác định nhóm thời gian
      countInCurrentTimeGroup++;
      if (currentTimeGroup === 1 && countInCurrentTimeGroup > timeGroup1Count) {
        currentTimeGroup = 2;
        countInCurrentTimeGroup = 1;
      } else if (currentTimeGroup === 2 && countInCurrentTimeGroup > timeGroup2Count) {
        currentTimeGroup = 3;
        countInCurrentTimeGroup = 1;
      }
      
      // Xác định thời gian tạo hồ sơ dựa trên nhóm
      let monthsAgo;
      let isExpired = false;
      
      if (currentTimeGroup === 1) {
        // Nhóm 1: 50 hồ sơ đã hết hạn
        monthsAgo = 7; // 7 tháng trước - đã hết hạn (6 tháng + 1 tháng)
        isExpired = true;
      } else if (currentTimeGroup === 2) {
        monthsAgo = 3; // 3 tháng trước - còn 3 tháng
      } else {
        monthsAgo = 5; // 5 tháng trước - còn 1 tháng (~30 ngày)
      }
      
      // Xác định giới tính dựa trên phòng
      const currentRoom = rooms[roomIndex];
      const gender = currentRoom.gender_type;
      
      const studentName = generateName(gender);
      const studentId = `287116${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const email = generateEmail(studentName, studentId);
      const phone = generatePhone();
      const cccd = generateCCCD();
      
      // Ngày sinh: 18-25 tuổi
      const age = Math.floor(Math.random() * 8) + 18;
      const dob = new Date(2006 - age, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      
      const province = provinces[Math.floor(Math.random() * provinces.length)];
      const address = `${Math.floor(Math.random() * 500) + 1} Đường ${Math.random() > 0.5 ? 'Lê Lợi' : 'Trần Hưng Đạo'}, ${province}`;
      const distance = Math.floor(Math.random() * 200) + 10; // 10-210 km
      
      // Xác định năm học và GPA dựa trên rổ
      let year, gpa, priorityReason;
      
      if (basket === 1) {
        // Rổ 1: Chính sách - có lý do ưu tiên, năm học ngẫu nhiên
        year = Math.floor(Math.random() * 4) + 1;
        gpa = year === 1 ? 0 : (Math.random() * 2 + 2).toFixed(2); // 2.0-4.0
        priorityReason = priorityReasons[Math.floor(Math.random() * priorityReasons.length)];
      } else if (basket === 2) {
        // Rổ 2: Tân sinh viên - năm 1, không có lý do ưu tiên
        year = 1;
        gpa = 0; // Năm 1 chưa có điểm
        priorityReason = null;
      } else {
        // Rổ 3: Khóa cũ - năm 2,3,4, không có lý do ưu tiên, GPA cao
        year = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
        gpa = (Math.random() * 1.5 + 2.5).toFixed(2); // 2.5-4.0 (GPA cao)
        priorityReason = null;
      }
      
      const faculty = faculties[Math.floor(Math.random() * faculties.length)];
      const classCode = `${faculty.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 10) + 1}`;
      
      // Tính điểm AI
      const { aiScore, aiSuggestion } = calculateAIScore(year, gpa, priorityReason);
      
      const aiReasoning = {
        priorityScore: priorityReason ? (priorityReason.toLowerCase().includes("hộ nghèo") ? 100 : 70) : 0,
        yearScore: { 1: 100, 2: 60, 3: 40, 4: 20 }[year],
        gpaScore: year === 1 ? 50 : parseFloat(gpa) * 25,
        totalScore: aiScore
      };
      
      // Tạo register form ID theo format: reg-timestamp-randomstring
      const regRandomStr = Math.random().toString(36).substring(2, 15);
      const registerFormId = `reg-${timestamp - userIndex * 1000}-${regRandomStr}`;
      
      // Ngày tạo hồ sơ: dựa trên nhóm thời gian + thêm 1 tháng
      const registerCreatedAt = new Date();
      registerCreatedAt.setMonth(registerCreatedAt.getMonth() - monthsAgo - 1);
      
      // Ngày duyệt: sau khi tạo hồ sơ 15 ngày
      const reviewedAt = new Date(registerCreatedAt);
      reviewedAt.setDate(reviewedAt.getDate() + 15);
      
      // Tạo hồ sơ đăng ký
      registerForms.push({
        id: registerFormId,
        student_name: studentName,
        student_id: studentId,
        student_email: email,
        phone_number: phone,
        gender,
        dob: dob.toISOString().split("T")[0],
        cccd,
        address,
        faculty,
        major: `Chuyên ngành ${faculty}`,
        class: classCode,
        year,
        gpa: parseFloat(gpa),
        distance,
        priority_reasons: priorityReason,
        status: "Chấp nhận",
        ai_suggestion: aiSuggestion,
        ai_score: aiScore,
        ai_reasoning: JSON.stringify(aiReasoning),
        evidence_images: null,
        note: "Hồ sơ đã được phê duyệt và tạo hợp đồng",
        reviewed_by: "admin-1",
        reviewed_at: reviewedAt.toISOString(),
        created_at: registerCreatedAt.toISOString(),
        updated_at: reviewedAt.toISOString()
      });
      
      // Tạo user ID
      const userId = `user-${timestamp - userIndex * 1000}`;
      
      // Tạo user
      users.push({
        id: userId,
        email,
        password: '__HASH_PLACEHOLDER__',
        _cccd: cccd, // dùng để hash sau, sẽ xóa trước khi insert
        full_name: studentName,
        role: "STUDENT",
        phone,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=random`,
        is_active: true,
        last_login: null,
        created_at: reviewedAt.toISOString(), // Tạo user khi duyệt hồ sơ
        updated_at: new Date().toISOString(),
        deleted_at: null
      });
      
      // Tạo contract ID theo format: contract-timestamp-randomstring
      const randomStr = Math.random().toString(36).substring(2, 15);
      const contractId = `contract-${timestamp - userIndex * 1000}-${randomStr}`;
      const contractNumber = `HD-2024-${(100000 + userIndex).toString()}`;
      
      // Ngày bắt đầu: dựa trên nhóm thời gian
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsAgo);
      
      // Ngày kết thúc: 6 tháng sau ngày bắt đầu
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 6);
      
      // Ngày ký: cùng ngày bắt đầu
      const signedAt = new Date(startDate);
      
      const createdAt = new Date(startDate);
      createdAt.setDate(createdAt.getDate() - 7); // Tạo trước 7 ngày
      
      contracts.push({
        id: contractId,
        user_id: userId,
        room_id: currentRoom.id,
        register_form_id: registerFormId, // Liên kết với hồ sơ đăng ký
        contract_number: contractNumber,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        rent_price: currentRoom.rent_price,
        deposit_amount: currentRoom.rent_price * 2,
        deposit_paid: true,
        hard_copy_received: true,
        email_sent_at: createdAt.toISOString(),
        status: isExpired ? "Expired" : "Active", // Expired nếu đã hết hạn
        snapshot_student_id: studentId,
        snapshot_cccd: cccd,
        snapshot_gender: gender,
        snapshot_year: year,
        snapshot_faculty: faculty,
        snapshot_phone: phone,
        terms_conditions: "Sinh viên cam kết tuân thủ nội quy ký túc xá, giữ gìn vệ sinh chung, không gây ồn ào, không sử dụng các thiết bị điện công suất lớn.",
        signed_at: signedAt.toISOString(),
        termination_reason: null,
        created_by: "admin-1",
        created_at: createdAt.toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Chuyển phòng nếu đủ sinh viên
      studentsInCurrentRoom++;
      if (studentsInCurrentRoom >= maxStudentsPerRoom) {
        roomIndex++;
        studentsInCurrentRoom = 0;
      }
    }
    
    // Tạo sinh viên theo từng rổ
    console.log(`\n📊 Phân bổ theo 3 rổ:`);
    console.log(`   - Rổ 1 (Chính sách): ${basket1Count} sinh viên (10%)`);
    console.log(`   - Rổ 2 (Tân sinh viên): ${basket2Count} sinh viên (60%)`);
    console.log(`   - Rổ 3 (Khóa cũ): ${basket3Count} sinh viên (30%)`);
    
    console.log(`\n📅 Phân bổ theo thời gian:`);
    console.log(`   - Nhóm 1: ${timeGroup1Count} hồ sơ (7 tháng trước - đã hết hạn)`);
    console.log(`   - Nhóm 2: ${timeGroup2Count} hồ sơ (3 tháng trước - còn 3 tháng)`);
    console.log(`   - Nhóm 3: ${timeGroup3Count} hồ sơ (5 tháng trước - còn 1 tháng, sắp hết hạn)`);
    
    // Rổ 1: Chính sách
    for (let i = 0; i < basket1Count; i++) {
      createStudent(1, i);
    }
    
    // Rổ 2: Tân sinh viên
    for (let i = 0; i < basket2Count; i++) {
      createStudent(2, i);
    }
    
    // Rổ 3: Khóa cũ
    for (let i = 0; i < basket3Count; i++) {
      createStudent(3, i);
    }

    // Hash tất cả CCCD song song (Promise.all) thay vì tuần tự
    // Chia thành batch 50 để tránh quá tải CPU
    console.log(`\n� Đang hash ${users.length} CCCD (song song theo batch 50)...`);
    const HASH_BATCH = 50;
    for (let i = 0; i < users.length; i += HASH_BATCH) {
      const batch = users.slice(i, i + HASH_BATCH);
      const hashes = await Promise.all(batch.map(u => bcrypt.hash(u._cccd, 10)));
      hashes.forEach((hash, j) => { users[i + j].password = hash; });
      console.log(`   ✓ ${Math.min(i + HASH_BATCH, users.length)}/${users.length}`);
    }
    // Xóa field tạm _cccd
    users.forEach(u => delete u._cccd);

    console.log(`\n📝 Đang insert ${registerForms.length} register forms vào database...`);
    
    // Insert register forms
    for (let i = 0; i < registerForms.length; i += 100) {
      const batch = registerForms.slice(i, i + 100);
      const values = batch.map(form => 
        `('${form.id}', '${form.student_name.replace(/'/g, "''")}', '${form.student_id}', '${form.student_email}', ` +
        `'${form.phone_number}', '${form.gender}', '${form.dob}', '${form.cccd}', '${form.address.replace(/'/g, "''")}', ` +
        `'${form.faculty}', '${form.major}', '${form.class}', ${form.year}, ${form.gpa}, ${form.distance}, ` +
        `${form.priority_reasons ? `'${form.priority_reasons.replace(/'/g, "''")}'` : "NULL"}, ` +
        `'${form.status}', '${form.ai_suggestion}', ${form.ai_score}, '${form.ai_reasoning}', ` +
        `NULL, '${form.note.replace(/'/g, "''")}', '${form.reviewed_by}', '${form.reviewed_at}', '${form.created_at}', '${form.updated_at}')`
      );

      const query = `
        INSERT INTO register_forms (
          id, student_name, student_id, student_email, phone_number, gender, dob, cccd, address,
          faculty, major, class, year, gpa, distance, priority_reasons, status, ai_suggestion,
          ai_score, ai_reasoning, evidence_images, note, reviewed_by, reviewed_at, created_at, updated_at
        ) VALUES ${values.join(", ")}
        ON CONFLICT (id) DO NOTHING;
      `;

      await pool.query(query);
      console.log(`   ✓ Đã insert ${Math.min((i + 100), registerForms.length)}/${registerForms.length} register forms`);
    }

    console.log(`\n📝 Đang insert ${users.length} users vào database...`);
    
    // Insert users
    for (let i = 0; i < users.length; i += 100) {
      const batch = users.slice(i, i + 100);
      const values = batch.map(user => 
        `('${user.id}', '${user.email}', '${user.password}', '${user.full_name.replace(/'/g, "''")}', ` +
        `'${user.role}', '${user.phone}', '${user.avatar}', ${user.is_active}, NULL, ` +
        `'${user.created_at}', '${user.updated_at}', NULL)`
      );

      const query = `
        INSERT INTO users (
          id, email, password, full_name, role, phone, avatar, is_active, last_login,
          created_at, updated_at, deleted_at
        ) VALUES ${values.join(", ")}
        ON CONFLICT (id) DO NOTHING;
      `;

      await pool.query(query);
      console.log(`   ✓ Đã insert ${Math.min((i + 100), users.length)}/${users.length} users`);
    }

    console.log(`\n📝 Đang insert ${contracts.length} contracts vào database...`);
    
    // Insert contracts
    for (let i = 0; i < contracts.length; i += 100) {
      const batch = contracts.slice(i, i + 100);
      const values = batch.map(contract => 
        `('${contract.id}', '${contract.user_id}', '${contract.room_id}', '${contract.register_form_id}', ` +
        `'${contract.contract_number}', '${contract.start_date}', '${contract.end_date}', ` +
        `${contract.rent_price}, ${contract.deposit_amount}, ${contract.deposit_paid}, ` +
        `${contract.hard_copy_received}, '${contract.email_sent_at}', '${contract.status}', ` +
        `'${contract.snapshot_student_id}', '${contract.snapshot_cccd}', '${contract.snapshot_gender}', ` +
        `${contract.snapshot_year}, '${contract.snapshot_faculty}', '${contract.snapshot_phone}', ` +
        `'${contract.terms_conditions.replace(/'/g, "''")}', '${contract.signed_at}', NULL, ` +
        `'${contract.created_by}', '${contract.created_at}', '${contract.updated_at}')`
      );

      const query = `
        INSERT INTO student_contracts (
          id, user_id, room_id, register_form_id, contract_number, start_date, end_date,
          rent_price, deposit_amount, deposit_paid, hard_copy_received, email_sent_at, status,
          snapshot_student_id, snapshot_cccd, snapshot_gender, snapshot_year, snapshot_faculty,
          snapshot_phone, terms_conditions, signed_at, termination_reason, created_by,
          created_at, updated_at
        ) VALUES ${values.join(", ")}
        ON CONFLICT (id) DO NOTHING;
      `;

      await pool.query(query);
      console.log(`   ✓ Đã insert ${Math.min((i + 100), contracts.length)}/${contracts.length} contracts`);
    }

    // ── Sinh viên đặc cách ──────────────────────────────────────────────────
    console.log(`\n📝 Đang tạo tài khoản sinh viên đặc cách (xu4ns0n@gmail.com)...`);
    {
      const specialPassword = "123";
      const specialPasswordHash = await bcrypt.hash(specialPassword, 10);
      const specialTimestamp = Date.now();

      // Lấy đúng phòng tiếp theo trong danh sách (phòng đang dở dang sau 999 SV)
      const specialRoom = rooms[roomIndex];
      if (!specialRoom) throw new Error("Không tìm thấy phòng để gán cho sinh viên đặc cách!");

      const specialRegFormId  = `reg-special-${specialTimestamp}`;
      const specialUserId     = `user-special-${specialTimestamp}`;
      const specialContractId = `contract-special-${specialTimestamp}`;
      const specialCccd       = '123456789012';

      const startDate = new Date(); startDate.setMonth(startDate.getMonth() - 3);
      const endDate   = new Date(startDate); endDate.setMonth(endDate.getMonth() + 6);
      const reviewedAt = new Date(startDate); reviewedAt.setDate(reviewedAt.getDate() - 15);
      const createdAt  = new Date(reviewedAt); createdAt.setDate(createdAt.getDate() - 7);

      // Register form
      await pool.query(`
        INSERT INTO register_forms (
          id, student_name, student_id, student_email, phone_number, gender, dob, cccd, address,
          faculty, major, class, year, gpa, distance, priority_reasons, status, ai_suggestion,
          ai_score, ai_reasoning, evidence_images, note, reviewed_by, reviewed_at, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
        ON CONFLICT (id) DO NOTHING
      `, [
        specialRegFormId,
        'Bùi Xuân Sơn', '28711699999', 'xu4ns0n@gmail.com', '0987654321',
        specialRoom.gender_type, '2003-05-15', '123456789012',
        '123 Đường Láng, Hà Nội', 'Công nghệ thông tin', 'Chuyên ngành Công nghệ thông tin',
        'CNTT1', 2, 3.20, 15, null,
        'Chấp nhận', 'Nên duyệt', 85,
        JSON.stringify({ priorityScore: 0, yearScore: 60, gpaScore: 80, totalScore: 85 }),
        null, 'Hồ sơ đã được phê duyệt và tạo hợp đồng', 'admin-1',
        reviewedAt.toISOString(), createdAt.toISOString(), reviewedAt.toISOString()
      ]);

      // User
      await pool.query(`
        INSERT INTO users (id, email, password, full_name, role, phone, avatar, is_active, last_login, created_at, updated_at, deleted_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO NOTHING
      `, [
        specialUserId, 'xu4ns0n@gmail.com', specialPasswordHash,
        'Bùi Xuân Sơn', 'STUDENT', '0987654321',
        'https://ui-avatars.com/api/?name=Bui+Xuan+Son&background=random',
        true, null, reviewedAt.toISOString(), new Date().toISOString(), null
      ]);

      // Contract
      await pool.query(`
        INSERT INTO student_contracts (
          id, user_id, room_id, register_form_id, contract_number, start_date, end_date,
          rent_price, deposit_amount, deposit_paid, hard_copy_received, email_sent_at, status,
          snapshot_student_id, snapshot_cccd, snapshot_gender, snapshot_year, snapshot_faculty,
          snapshot_phone, terms_conditions, signed_at, termination_reason, created_by, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
        ON CONFLICT (id) DO NOTHING
      `, [
        specialContractId, specialUserId, specialRoom.id, specialRegFormId,
        `HD-2024-SPECIAL`, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0],
        specialRoom.rent_price, specialRoom.rent_price * 2, true, true,
        createdAt.toISOString(), 'Active',
        '28711699999', specialCccd, specialRoom.gender_type, 2, 'Công nghệ thông tin', '0987654321',
        'Sinh viên cam kết tuân thủ nội quy ký túc xá.',
        startDate.toISOString(), null, 'admin-1', createdAt.toISOString(), new Date().toISOString()
      ]);

      // Cập nhật occupancy phòng đặc cách
      await pool.query(
        `UPDATE rooms SET current_occupancy = current_occupancy + 1, updated_at = NOW() WHERE id = $1`,
        [specialRoom.id]
      );

      console.log(`   ✓ Tạo xong: xu4ns0n@gmail.com | mật khẩu: 123 | phòng: ${specialRoom.id}`);
    }
    // ────────────────────────────────────────────────────────────────────────

    // Cập nhật current_occupancy cho các phòng
    console.log(`\n📝 Đang cập nhật current_occupancy cho các phòng...`);
    
    for (const room of rooms) {
      const occupancyResult = await pool.query(
        `SELECT COUNT(*) as count FROM student_contracts WHERE room_id = $1 AND status IN ('Active', 'Expired')`,
        [room.id]
      );
      
      const occupancy = parseInt(occupancyResult.rows[0].count);
      
      await pool.query(
        `UPDATE rooms SET current_occupancy = $1, updated_at = NOW() WHERE id = $2`,
        [occupancy, room.id]
      );
    }
    
    console.log(`   ✓ Đã cập nhật occupancy cho ${roomIndex + 1} phòng`);

    // Thống kê
    const expiredCount = contracts.filter(c => c.status === "Expired").length;
    const activeCount = contracts.filter(c => c.status === "Active").length;

    console.log(`\n✅ Đã tạo thành công fake data!`);
    console.log(`📊 Tổng quan:`);
    console.log(`   - ${registerForms.length} hồ sơ đăng ký (trạng thái: Chấp nhận)`);
    console.log(`   - ${users.length} tài khoản sinh viên (mật khẩu: số CCCD của sinh viên)`);
    console.log(`   - ${contracts.length} hợp đồng (${activeCount} Active, ${expiredCount} Expired)`);
    console.log(`   - ${roomIndex + 1} phòng đã được gán sinh viên`);
    console.log(`\n📋 Phân bổ theo rổ:`);
    console.log(`   - Rổ 1 (Chính sách): ${basket1Count} (10%)`);
    console.log(`   - Rổ 2 (Tân sinh viên): ${basket2Count} (60%)`);
    console.log(`   - Rổ 3 (Khóa cũ): ${basket3Count} (30%)`);
    console.log(`\n📅 Phân bổ theo thời gian:`);
    console.log(`   - ${timeGroup1Count} hợp đồng: 7 tháng trước (đã hết hạn - Expired)`);
    console.log(`   - ${timeGroup2Count} hợp đồng: 3 tháng trước (còn 3 tháng - Active)`);
    console.log(`   - ${timeGroup3Count} hợp đồng: 5 tháng trước (còn 1 tháng - Active, sắp hết hạn)`);
    console.log(`\n⏱️  Timeline mỗi hồ sơ:`);
    console.log(`   - Tạo hồ sơ → +15 ngày → Duyệt hồ sơ → Tạo hợp đồng (6 tháng)`);
    
  } catch (error) {
    console.error("❌ Lỗi khi tạo fake data:", error);
  } finally {
    await pool.end();
  }
}

// Chạy script
generateFakeStudentContracts();
