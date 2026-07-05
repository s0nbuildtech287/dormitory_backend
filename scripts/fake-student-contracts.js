const pool = require("../src/config/database");
const bcrypt = require("bcryptjs");

// Danh sách tên Việt Nam
const firstNames = {
  male: ["Văn", "Đức", "Minh", "Hoàng", "Quang", "Tuấn", "Hải", "Anh", "Duy", "Khoa", "Thành", "Long", "Nam", "Phong", "Tùng", "Hùng", "Bảo", "Trung", "Sơn", "Tân"],
  female: ["Thị", "Hồng", "Thu", "Lan", "Hương", "Mai", "Linh", "Nga", "Phương", "Trang", "Hà", "Nhung", "Thảo", "Vy", "Anh", "Ngọc", "Diệu", "Thanh", "Huyền", "My"]
};

const lastNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const middleNames = ["Văn", "Thị", "Đức", "Hữu", "Công", "Minh", "Thanh", "Quốc", "Xuân", "Bảo", "Ngọc", "Thúy", "Kim", "Phương"];

const foreignFirstNames = {
  male: ["John", "David", "Michael", "Daniel", "Kevin", "Lucas", "Henry", "Eric", "Alex", "Tom"],
  female: ["Anna", "Linda", "Maria", "Sophie", "Julia", "Emma", "Lily", "Grace", "Mia", "Eva"],
};

const foreignLastNames = ["Smith", "Johnson", "Brown", "Taylor", "Wilson", "Miller", "Anderson", "Thomas", "Moore", "Martin"];

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

function generateForeignName(gender) {
  const firstName = gender === "Nam"
    ? foreignFirstNames.male[Math.floor(Math.random() * foreignFirstNames.male.length)]
    : foreignFirstNames.female[Math.floor(Math.random() * foreignFirstNames.female.length)];
  const lastName = foreignLastNames[Math.floor(Math.random() * foreignLastNames.length)];
  return `${firstName} ${lastName}`;
}

function generateEmail(name, studentId) {
  const nameParts = name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .split(" ");
  
  const firstName = nameParts[nameParts.length - 1];
  const lastNameInitial = nameParts[0].charAt(0);
  
  // Dùng toàn bộ studentId để đảm bảo unique
  return `${firstName}${lastNameInitial}${studentId}@student.edu.vn`;
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



    // Lấy toàn bộ phòng để gán theo reserved_for nhưng vẫn có fallback nếu pool lệch
    const roomsResult = await pool.query(`
      SELECT id, room_number, building, floor, gender_type, rent_price, capacity, reserved_for
      FROM rooms
      ORDER BY id
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
    const specialStudent = {
      email: "xu4ns0n@gmail.com",
      studentId: "28711699999",
      cccd: "123456789012",
      phone: "0987654321",
      fullName: "Bùi Xuân Sơn",
      password: "123",
      faculty: "Công nghệ thông tin",
      major: "Chuyên ngành Công nghệ thông tin",
      classCode: "CNTT1",
      year: 2,
      gpa: 3.2,
      dob: "2003-05-15",
      address: "123 Đường Láng, Hà Nội",
      distance: 15,
    };

    const roomState = rooms.map((room) => ({
      ...room,
      occupancy: 0,
    }));

    const roomPools = roomState.reduce(
      (acc, room) => {
        const key = room.reserved_for || "general";
        if (!acc[key]) acc[key] = [];
        acc[key].push(room);
        acc.all.push(room);
        return acc;
      },
      { general: [], freshmen: [], returning_students: [], international: [], all: [] }
    );

    const cohortPlan = [
      { cohort: "freshmen", tag: "general", count: 425 },
      { cohort: "freshmen", tag: "policy", count: 50 },
      { cohort: "freshmen", tag: "international", count: 25 },
      { cohort: "returning_students", tag: "general", count: 425 },
      { cohort: "returning_students", tag: "policy", count: 50 },
      { cohort: "returning_students", tag: "international", count: 25 },
    ];

    const studentPlans = cohortPlan.flatMap((item) =>
      Array.from({ length: item.count }, () => ({ cohort: item.cohort, tag: item.tag }))
    );

    const timeBuckets = [
      { count: 50, monthsAgo: 7, expired: true },
      { count: 800, monthsAgo: 3, expired: false },
      { count: 150, monthsAgo: 5, expired: false },
    ];
    const timePlan = timeBuckets.flatMap((item) =>
      Array.from({ length: item.count }, () => ({ monthsAgo: item.monthsAgo, expired: item.expired }))
    );

    let userIndex = 0;
    let timeIndex = 0;
    
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

    function pickRoomForPlan(plan) {
      const preferredPools = [];

      if (plan.tag === "international") {
        preferredPools.push("international");
      }

      if (plan.cohort === "freshmen") {
        preferredPools.push("freshmen");
      } else if (plan.cohort === "returning_students") {
        preferredPools.push("returning_students");
      }

      preferredPools.push("general");

      const tried = new Set();
      for (const poolName of preferredPools) {
        if (tried.has(poolName)) continue;
        tried.add(poolName);

        const candidates = (roomPools[poolName] || [])
          .filter((room) => room.occupancy < room.capacity)
          .sort((a, b) => a.occupancy - b.occupancy || a.id.localeCompare(b.id));

        if (candidates.length > 0) {
          candidates[0].occupancy += 1;
          return candidates[0];
        }
      }

      const fallback = roomPools.all
        .filter((room) => room.occupancy < room.capacity)
        .sort((a, b) => a.occupancy - b.occupancy || a.id.localeCompare(b.id))[0];

      if (!fallback) {
        throw new Error("Không còn phòng trống phù hợp để gán hợp đồng");
      }

      fallback.occupancy += 1;
      return fallback;
    }

    function getPriorityReason(plan) {
      if (plan.tag === "international") {
        const internationalReasons = [
          "Lưu học sinh (Lào/Campuchia)",
          "Du học sinh",
          "Sinh viên quốc tế",
        ];
        return internationalReasons[Math.floor(Math.random() * internationalReasons.length)];
      }

      if (plan.tag === "policy") {
        const policyReasons = [
          "Hộ nghèo cận nghèo",
          "Vùng sâu vùng xa",
          "Con thương binh, liệt sỹ",
          "Sinh viên khuyết tật",
        ];
        return policyReasons[Math.floor(Math.random() * policyReasons.length)];
      }

      return null;
    }
    
    // Hàm tạo sinh viên
    function createStudent(plan, index) {
      userIndex++;
      
      const timeProfile = timePlan[timeIndex] || timePlan[timePlan.length - 1];
      timeIndex++;

      const monthsAgo = timeProfile.monthsAgo;
      const isExpired = timeProfile.expired;

      const currentRoom = pickRoomForPlan(plan);
      const gender = currentRoom.gender_type;
      
      const studentName = plan.tag === "international" ? generateForeignName(gender) : generateName(gender);
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
      
      let year;
      let gpa;
      if (plan.cohort === "freshmen") {
        year = 1;
        gpa = 0;
      } else {
        year = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
        gpa = (Math.random() * 1.5 + 2.5).toFixed(2); // 2.5-4.0
      }

      const priorityReason = getPriorityReason(plan);
      
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
    }
    
    // Tạo sinh viên theo cụm phòng: mỗi phòng 5 người, cùng cohort và cùng khoa/ngành
    const seedRooms = rooms.slice(0, 200);
    if (seedRooms.length < 200) {
      throw new Error(`Cần ít nhất 200 phòng để fake dữ liệu, hiện chỉ có ${seedRooms.length}`);
    }

    const roomPlans = [];
    const cohortLayout = [
      { cohort: "freshmen", roomOffset: 0 },
      { cohort: "returning_students", roomOffset: 100 },
    ];

    cohortLayout.forEach(({ cohort, roomOffset }) => {
      let internationalRoomCount = 0;
      let policyRoomCount = 0;
      for (let roomIndex = 0; roomIndex < 100; roomIndex++) {
        const room = seedRooms[roomOffset + roomIndex];
        
        let roomType = "general";
        if (room.reserved_for === "xung_kich") {
          roomType = "general"; // volunteer students are domestic (general / policy)
        } else if (room.reserved_for === "international" && internationalRoomCount < 5) {
          roomType = "international";
          internationalRoomCount++;
        } else if ((room.reserved_for === "freshmen" || room.reserved_for === "returning_students") && policyRoomCount < 50) {
          roomType = "policy";
          policyRoomCount++;
        } else {
          roomType = "general";
        }

        const faculty = faculties[(roomOffset + roomIndex) % faculties.length];
        const major = `Chuyên ngành ${faculty}`;
        const slotTags =
          roomType === "international"
            ? ["international", "international", "international", "international", "international"]
            : roomType === "policy"
              ? ["policy", "general", "general", "general", "general"]
              : ["general", "general", "general", "general", "general"];

        roomPlans.push({ room, cohort, roomType, faculty, major, slotTags });
      }
    });

    const roomStats = {
      freshmen: { general: 0, policy: 0, international: 0 },
      returning_students: { general: 0, policy: 0, international: 0 },
    };

    roomPlans.forEach((plan) => {
      roomStats[plan.cohort][plan.roomType] += 1;
    });

    console.log(`\n📊 Phân bổ theo nhóm hồ sơ:`);
    console.log(`   - Tân sinh viên: 500 (50%)`);
    console.log(`     • Phòng thường: ${roomStats.freshmen.general}`);
    console.log(`     • Phòng chính sách: ${roomStats.freshmen.policy}`);
    console.log(`     • Phòng quốc tế: ${roomStats.freshmen.international}`);
    console.log(`   - Lưu sinh viên: 500 (50%)`);
    console.log(`     • Phòng thường: ${roomStats.returning_students.general}`);
    console.log(`     • Phòng chính sách: ${roomStats.returning_students.policy}`);
    console.log(`     • Phòng quốc tế: ${roomStats.returning_students.international}`);

    console.log(`\n📅 Phân bổ theo thời gian:`);
    console.log(`   - 50 hợp đồng: 7 tháng trước (đã hết hạn)`);
    console.log(`   - 800 hợp đồng: 3 tháng trước (còn 3 tháng)`);
    console.log(`   - 150 hợp đồng: 5 tháng trước (còn 1 tháng, sắp hết hạn)`);

    let studentIndex = 0;
    const internationalReasons = [
      "Lưu học sinh (Lào/Campuchia)",
      "Du học sinh",
      "Sinh viên quốc tế",
    ];
    const policyReasons = [
      "Hộ nghèo cận nghèo",
      "Vùng sâu vùng xa",
      "Con thương binh, liệt sỹ",
      "Sinh viên khuyết tật",
    ];
    let specialStudentPlaced = false;

    for (const plan of roomPlans) {
      const roomStudents = [];
      for (let slotIndex = 0; slotIndex < plan.slotTags.length; slotIndex++) {
        const timeProfile = timePlan[studentIndex] || timePlan[timePlan.length - 1];
        studentIndex++;

        const tag = plan.slotTags[slotIndex];
        const gender = plan.room.gender_type;
        const isSpecialStudent = plan.room.id === "room-200" && tag === "general" && !specialStudentPlaced;
        const studentName = isSpecialStudent ? specialStudent.fullName : (tag === "international" ? generateForeignName(gender) : generateName(gender));
        const studentId = isSpecialStudent ? specialStudent.studentId : `287116${String(studentIndex).padStart(4, "0")}`;
        const email = isSpecialStudent ? specialStudent.email : generateEmail(studentName, studentId);
        const phone = isSpecialStudent ? specialStudent.phone : generatePhone();
        const cccd = isSpecialStudent ? specialStudent.cccd : generateCCCD();
        const age = isSpecialStudent ? null : (plan.cohort === "freshmen" ? 18 : Math.floor(Math.random() * 4) + 20);
        const dob = isSpecialStudent
          ? new Date(specialStudent.dob)
          : new Date(2006 - age, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        const province = provinces[Math.floor(Math.random() * provinces.length)];
        const address = isSpecialStudent
          ? specialStudent.address
          : `${Math.floor(Math.random() * 500) + 1} Duong ${Math.random() > 0.5 ? 'Le Loi' : 'Tran Hung Dao'}, ${province}`;
        const distance = isSpecialStudent ? specialStudent.distance : Math.floor(Math.random() * 200) + 10;
        const year = isSpecialStudent ? specialStudent.year : (plan.cohort === "freshmen" ? 1 : Math.floor(Math.random() * 3) + 2);
        const gpa = isSpecialStudent ? specialStudent.gpa : (year === 1 ? 0 : (Math.random() * 1.5 + 2.5).toFixed(2));
        const priorityReason =
          tag === "international"
            ? internationalReasons[Math.floor(Math.random() * internationalReasons.length)]
            : tag === "policy"
              ? policyReasons[Math.floor(Math.random() * policyReasons.length)]
              : null;

        const faculty = isSpecialStudent ? specialStudent.faculty : plan.faculty;
        const major = isSpecialStudent ? specialStudent.major : plan.major;
        const classCode = isSpecialStudent
          ? specialStudent.classCode
          : `${faculty.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 10) + 1}`;
        const { aiScore, aiSuggestion } = calculateAIScore(year, gpa, priorityReason);
        const aiReasoning = {
          priorityScore: priorityReason ? (priorityReason.toLowerCase().includes("hộ nghèo") ? 100 : 70) : 0,
          yearScore: { 1: 100, 2: 60, 3: 40, 4: 20 }[year],
          gpaScore: year === 1 ? 50 : parseFloat(gpa) * 25,
          totalScore: aiScore
        };

        const regRandomStr = Math.random().toString(36).substring(2, 15);
        const registerFormId = `reg-${Date.now()}-${studentIndex}-${regRandomStr}`;
        const registerCreatedAt = new Date();
        registerCreatedAt.setMonth(registerCreatedAt.getMonth() - timeProfile.monthsAgo - 1);
        const reviewedAt = new Date(registerCreatedAt);
        reviewedAt.setDate(reviewedAt.getDate() + 15);

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
          major,
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

        const userId = `user-${Date.now()}-${studentIndex}-${Math.random().toString(36).substring(2, 10)}`;
        users.push({
          id: userId,
          email,
          password: "__HASH_PLACEHOLDER__",
          _cccd: cccd,
          _plainPassword: isSpecialStudent ? specialStudent.password : null,
          full_name: studentName,
          role: "STUDENT",
          phone,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=random`,
          is_active: true,
          last_login: null,
          created_at: reviewedAt.toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        });

        const randomStr = Math.random().toString(36).substring(2, 15);
        const contractId = `contract-${Date.now()}-${studentIndex}-${randomStr}`;
        const contractNumber = `HD-2024-${(100000 + studentIndex + 1).toString()}`;
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - timeProfile.monthsAgo);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 6);
        const signedAt = new Date(startDate);
        const createdAt = new Date(startDate);
        createdAt.setDate(createdAt.getDate() - 7);

        contracts.push({
          id: contractId,
          user_id: userId,
          room_id: plan.room.id,
          register_form_id: registerFormId,
          contract_number: contractNumber,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          rent_price: plan.room.rent_price,
          deposit_amount: plan.room.rent_price * 2,
          deposit_paid: true,
          hard_copy_received: true,
          email_sent_at: createdAt.toISOString(),
          status: isSpecialStudent ? "Active" : (timeProfile.expired ? "Expired" : "Active"),
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
          updated_at: new Date().toISOString(),
          volunteer_role: plan.room.reserved_for === "xung_kich" ? "xung_kich" : null,
          _building: plan.room.building
        });

        roomStudents.push(studentName);
        if (isSpecialStudent) {
          specialStudentPlaced = true;
        }
      }

      plan.room.occupancy = roomStudents.length;
    }

    if (!specialStudentPlaced) {
      throw new Error("Khong the gan tai khoan sinh vien dac biet vao trong 1000 hop dong.");
    }

    // Bổ nhiệm ngẫu nhiên 1 Trưởng xung kích cho mỗi tòa nhà từ các sinh viên xung kích
    const contractsByBuilding = {};
    contracts.forEach((c) => {
      if (c.volunteer_role === "xung_kich") {
        if (!contractsByBuilding[c._building]) {
          contractsByBuilding[c._building] = [];
        }
        contractsByBuilding[c._building].push(c);
      }
    });

    for (const bld of Object.keys(contractsByBuilding)) {
      const bldContracts = contractsByBuilding[bld];
      if (bldContracts.length > 0) {
        // Ưu tiên hợp đồng Active, nếu không có thì lấy Expired
        const activeContracts = bldContracts.filter(c => c.status === "Active");
        const listToPick = activeContracts.length > 0 ? activeContracts : bldContracts;
        const randomIdx = Math.floor(Math.random() * listToPick.length);
        listToPick[randomIdx].volunteer_role = "truong_xung_kich";
      }
    }

    // Clean up temporary property
    contracts.forEach((c) => {
      delete c._building;
    });

    // Hash tất cả CCCD song song (Promise.all) thay vì tuần tự
    // Chia thành batch 50 để tránh quá tải CPU
    console.log(`\n� Đang hash ${users.length} CCCD (song song theo batch 50)...`);
    const HASH_BATCH = 50;
    for (let i = 0; i < users.length; i += HASH_BATCH) {
      const batch = users.slice(i, i + HASH_BATCH);
      const hashes = await Promise.all(batch.map(u => bcrypt.hash(u._plainPassword || u._cccd, 10)));
      hashes.forEach((hash, j) => { users[i + j].password = hash; });
      console.log(`   ✓ ${Math.min(i + HASH_BATCH, users.length)}/${users.length}`);
    }
    // Xóa field tạm _cccd
    users.forEach(u => {
      delete u._cccd;
      delete u._plainPassword;
    });

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
        `'${contract.created_by}', '${contract.created_at}', '${contract.updated_at}', ` +
        `${contract.volunteer_role ? `'${contract.volunteer_role}'` : "NULL"})`
      );

      const query = `
        INSERT INTO student_contracts (
          id, user_id, room_id, register_form_id, contract_number, start_date, end_date,
          rent_price, deposit_amount, deposit_paid, hard_copy_received, email_sent_at, status,
          snapshot_student_id, snapshot_cccd, snapshot_gender, snapshot_year, snapshot_faculty,
          snapshot_phone, terms_conditions, signed_at, termination_reason, created_by,
          created_at, updated_at, volunteer_role
        ) VALUES ${values.join(", ")}
        ON CONFLICT (id) DO NOTHING;
      `;

      await pool.query(query);
      console.log(`   ✓ Đã insert ${Math.min((i + 100), contracts.length)}/${contracts.length} contracts`);
    }

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
    
    console.log(`   ✓ Đã cập nhật occupancy cho ${rooms.length} phòng`);

    // Thống kê
    const expiredCount = contracts.filter(c => c.status === "Expired").length;
    const activeCount = contracts.filter(c => c.status === "Active").length;

    console.log(`\n✅ Đã tạo thành công fake data!`);
    console.log(`📊 Tổng quan:`);
    console.log(`   - ${registerForms.length} hồ sơ đăng ký (trạng thái: Chấp nhận)`);
    console.log(`   - ${users.length} tai khoan sinh vien (rieng ${specialStudent.email} co mat khau: ${specialStudent.password})`);
    console.log(`   - ${contracts.length} hợp đồng (${activeCount} Active, ${expiredCount} Expired)`);
    console.log(`   - 200 phòng đã được gán sinh viên`);
    console.log(`\n📋 Phân bổ theo phòng:`);
    console.log(`   - 100 phòng tân sinh viên`);
    console.log(`   - 100 phòng lưu sinh viên`);
    console.log(`   - Trong mỗi cụm phòng: 5% quốc tế, 10% chính sách, còn lại là thường`);
    console.log(`\n📅 Phân bổ theo thời gian:`);
    console.log(`   - 50 hợp đồng: 7 tháng trước (đã hết hạn - Expired)`);
    console.log(`   - 800 hợp đồng: 3 tháng trước (còn 3 tháng - Active)`);
    console.log(`   - 150 hợp đồng: 5 tháng trước (còn 1 tháng - Active, sắp hết hạn)`);
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


