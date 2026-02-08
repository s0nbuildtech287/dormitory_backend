const RegisterFormDAO = require("../dao/RegisterFormDAO");
const LogSystemDAO = require("../dao/LogSystemDAO");
const SettingsDAO = require("../dao/SettingsDAO");
const xlsx = require("xlsx");

class RegistrationService {
  /**
   * ============================================================
   * HỆ THỐNG TÍNH ĐIỂM AI MỚI
   * ============================================================
   *
   * CÔNG THỨC:
   * aiScore = (PriorityScore × W₁) + (YearScore × W₂) + (GPAScore × W₃)
   *
   * 1. PRIORITY SCORE (Thang 100):
   *    - Chính sách tuyệt đối: 100
   *    - Khu vực ưu tiên: 70
   *    - Đối tượng khác: 30
   *    - Không thuộc diện ưu tiên: 0
   *
   * 2. YEAR SCORE (Thang 100):
   *    - Năm 1: 100
   *    - Năm 2: 60
   *    - Năm 3: 40
   *    - Năm 4: 20
   *
   * 3. GPA SCORE (Thang 100):
   *    - Công thức: GPA × 25 (cho hệ 4.0)
   *    - Filter: GPA < 2.0 → Loại trực tiếp
   *
   * 4. WEIGHTING FACTORS:
   *    - W₁: Trọng số Ưu tiên (hoàn cảnh gia đình)
   *    - W₂: Trọng số Năm học (khóa mới)
   *    - W₃: Trọng số GPA (thành tích học tập)
   *    - Điều kiện: W₁ + W₂ + W₃ = 1.0
   * ============================================================
   */

  /**
   * Fetch scoring weights from settings with default values
   */
  async getScoringWeights() {
    try {
      const setting = await SettingsDAO.getSettingByName("system", "scoring_weights");

      if (setting && setting.value && setting.value.weights) {
        return {
          w1_priority: setting.value.weights.w1_priority || 0.25,
          w2_year: setting.value.weights.w2_year || 0.35,
          w3_gpa: setting.value.weights.w3_gpa || 0.4,
        };
      }

      // Default weights if not found
      return {
        w1_priority: 0.25,
        w2_year: 0.35,
        w3_gpa: 0.4,
      };
    } catch (error) {
      console.warn("⚠️ Could not fetch scoring weights, using defaults:", error.message);
      return {
        w1_priority: 0.25,
        w2_year: 0.35,
        w3_gpa: 0.4,
      };
    }
  }

  /**
   * Calculate Priority Score based on priority_reasons
   * @param {string} priorityReasons - Priority reason string
   * @returns {number} Priority score (0-100)
   */
  calculatePriorityScore(priorityReasons) {
    if (!priorityReasons) {
      return 0; // Không thuộc diện ưu tiên
    }

    const lowerReason = priorityReasons.toLowerCase();

    // Chính sách tuyệt đối (100 điểm)
    if (
      lowerReason.includes("hộ nghèo") ||
      lowerReason.includes("cận nghèo") ||
      lowerReason.includes("thương binh") ||
      lowerReason.includes("liệt sỹ") ||
      lowerReason.includes("khuyết tật") ||
      lowerReason.includes("lưu học sinh") ||
      lowerReason.includes("hoàn cảnh khó khăn đặc biệt")
    ) {
      return 100;
    }

    // Khu vực ưu tiên (70 điểm)
    if (lowerReason.includes("vùng sâu") || lowerReason.includes("vùng xa") || lowerReason.includes("hải đảo") || lowerReason.includes("vùng có điều kiện kinh tế đặc biệt khó khăn")) {
      return 70;
    }

    // Đối tượng khác (30 điểm)
    if (lowerReason.includes("giấy xác nhận ưu tiên") || lowerReason.includes("ưu tiên khác")) {
      return 30;
    }

    // Mặc định: không thuộc diện ưu tiên (0 điểm)
    return 0;
  }

  /**
   * Calculate Year Score based on student year
   * @param {number} year - Student year (1-4)
   * @returns {number} Year score (0-100)
   */
  calculateYearScore(year) {
    switch (year) {
      case 1:
        return 100;
      case 2:
        return 60;
      case 3:
        return 40;
      case 4:
        return 20;
      default:
        return 0; // Invalid year
    }
  }

  /**
   * Calculate GPA Score
   * Formula: GPA × 25 (for 4.0 system)
   * @param {number} gpa - Student GPA
   * @returns {object} { score: number, isFiltered: boolean }
   */
  calculateGPAScore(gpa) {
    // GPA filtering: reject if < 2.0
    if (gpa !== null && gpa < 2.0) {
      return {
        score: 0,
        isFiltered: true,
        reason: "GPA < 2.0",
      };
    }

    if (gpa === null || gpa === undefined) {
      return {
        score: 0,
        isFiltered: false,
      };
    }

    // Formula: GPA × 25
    const score = Math.min(gpa * 25, 100); // Cap at 100
    return {
      score: Math.round(score),
      isFiltered: false,
    };
  }

  /**
   * Calculate final AI Score
   * Formula: aiScore = (PriorityScore × W₁) + (YearScore × W₂) + (GPAScore × W₃)
   * @param {object} params - { priorityScore, yearScore, gpaScore, w1, w2, w3 }
   * @returns {number} Final AI score
   */
  calculateFinalAIScore(params) {
    const { priorityScore, yearScore, gpaScore, w1, w2, w3 } = params;

    const score = priorityScore * w1 + yearScore * w2 + gpaScore * w3;
    return Math.round(score);
  }

  /**
   * Determine AI Suggestion based on score
   * @param {number} score - AI score
   * @returns {string} AI suggestion
   */
  determineAISuggestion(score) {
    if (score >= 80) {
      return "Nên duyệt";
    } else if (score >= 60) {
      return "Cân nhắc";
    } else {
      return "Không ưu tiên";
    }
  }
  /**
   * Get all registrations with filters
   */
  async getRegistrations(filters = {}) {
    try {
      return await RegisterFormDAO.searchAndFilter(filters);
    } catch (error) {
      throw new Error(`Get registrations failed: ${error.message}`);
    }
  }
  async getRegistrationById(id) {
    try {
      const registration = await RegisterFormDAO.findById(id);
      if (!registration) {
        throw new Error("Registration not found");
      }
      return registration;
    } catch (error) {
      throw new Error(`Get registration failed: ${error.message}`);
    }
  }

  /**
   * Create new registration
   */
  async createRegistration(data, req = null) {
    try {
      const registrationId = `reg-${Date.now()}`;
      const registration = await RegisterFormDAO.create({
        id: registrationId,
        ...data,
        status: "Chờ duyệt",
      });

      // Log action
      if (req && req.user) {
        await LogSystemDAO.log(req.user.userId, "CREATE_REGISTRATION", "register_forms", registrationId, null, registration, req);
      }

      return registration;
    } catch (error) {
      throw new Error(`Create registration failed: ${error.message}`);
    }
  }

  /**
   * Approve registration
   */
  async approveRegistration(id, adminId, note = null, req = null) {
    try {
      const oldData = await RegisterFormDAO.findById(id);
      if (!oldData) {
        throw new Error("Registration not found");
      }

      await RegisterFormDAO.updateStatus(id, "Chấp nhận", adminId, note);

      // Log action
      await LogSystemDAO.log(adminId, "APPROVE_REGISTRATION", "register_forms", id, { status: oldData.status }, { status: "Chấp nhận", note }, req);

      return await RegisterFormDAO.findById(id);
    } catch (error) {
      throw new Error(`Approve registration failed: ${error.message}`);
    }
  }

  /**
   * Reject registration
   */
  async rejectRegistration(id, adminId, note, req = null) {
    try {
      const oldData = await RegisterFormDAO.findById(id);
      if (!oldData) {
        throw new Error("Registration not found");
      }

      await RegisterFormDAO.updateStatus(id, "Từ chối", adminId, note);

      // Log action
      await LogSystemDAO.log(adminId, "REJECT_REGISTRATION", "register_forms", id, { status: oldData.status }, { status: "Từ chối", note }, req);

      return await RegisterFormDAO.findById(id);
    } catch (error) {
      throw new Error(`Reject registration failed: ${error.message}`);
    }
  }

  /**
   * Import registrations from Excel file với chi tiết xử lý từng bước
   *
   * LUỒNG IMPORT EXCEL:
   * 1. Đọc file Excel/CSV từ Google Form đã export
   * 2. Validate từng dòng dữ liệu
   * 3. Chuẩn hóa dữ liệu (format, trim, lowercase email...)
   * 4. Tính điểm AI suggestion (nếu có đủ thông tin)
   * 5. Insert vào database
   * 6. Log lại quá trình import
   *
   * @param {string} filePath - Đường dẫn file Excel đã upload
   * @param {string} adminId - ID của admin thực hiện import
   * @param {object} req - Request object để log
   * @returns {object} Kết quả import: { success: số lượng thành công, errors: danh sách lỗi }
   */
  async importFromExcel(filePath, adminId, req = null) {
    try {
      console.log("📂 BƯỚC 1: Đọc file Excel/CSV...");

      // Đọc file với UTF-8 encoding
      // Codepage 65001 = UTF-8
      const workbook = xlsx.readFile(filePath, {
        codepage: 65001, // Force UTF-8
        type: "binary",
      });

      const sheetName = workbook.SheetNames[0]; // Lấy sheet đầu tiên
      const sheet = workbook.Sheets[sheetName];

      // Chuyển sheet thành JSON array
      // Header row sẽ trở thành key của object
      const rawData = xlsx.utils.sheet_to_json(sheet, {
        raw: false, // Convert tất cả thành string
        defval: "", // Default value cho empty cells
      });

      console.log(`✅ Đã đọc ${rawData.length} dòng dữ liệu từ file`);
      console.log("📋 Preview dòng đầu tiên:", rawData[0]);

      const registrations = [];
      const errors = [];
      const warnings = [];

      console.log("\n🔄 BƯỚC 2: Xử lý từng dòng dữ liệu...\n");

      // Xử lý từng dòng trong Excel
      for (let i = 0; i < rawData.length; i++) {
        const rowNumber = i + 2; // +2 vì Excel bắt đầu từ 1 và có header row
        const row = rawData[i];

        try {
          console.log(`\n--- Xử lý dòng ${rowNumber} ---`);

          // ========== BƯỚC 2.1: VALIDATE DỮ LIỆU BỮT BUỘC ==========
          const validationErrors = [];

          // Các trường bắt buộc - hỗ trợ cả tiếng Việt và snake_case từ CSV
          if (!row["Họ tên"] && !row["student_name"]) {
            validationErrors.push("Thiếu họ tên");
          }
          // CSV có cột 'email' nhưng trong DB là 'student_email', nên check cả hai
          if (!row["Email"] && !row["email"] && !row["student_email"]) {
            validationErrors.push("Thiếu email");
          }
          if (!row["Số điện thoại"] && !row["phone"] && !row["phone_number"]) {
            validationErrors.push("Thiếu số điện thoại");
          }
          if (!row["Giới tính"] && !row["gender"]) {
            validationErrors.push("Thiếu giới tính");
          }

          if (validationErrors.length > 0) {
            throw new Error(`Dữ liệu không hợp lệ: ${validationErrors.join(", ")}`);
          }

          // ========== BƯỚC 2.2: CHUẨN HÓA DỮ LIỆU ==========
          console.log("  📝 Chuẩn hóa dữ liệu...");

          // Lấy và chuẩn hóa email (lowercase, trim)
          // CSV có 2 cột: 'email' (email người đăng ký) và 'student_email' (email sinh viên)
          // Ta lưu student_email vào DB
          const studentEmail = (row["student_email"] || row["Email"] || row["email"]).toString().trim().toLowerCase();

          // Chuẩn hóa giới tính (ENCODING-AGNOSTIC - chỉ check chữ cái đầu)
          let genderRaw = (row["Giới tính"] || row["gender"]).toString().trim();
          const firstChar = genderRaw.charAt(0).toUpperCase();
          let gender; // Khai báo biến

          // Logic: N + "am" = Nam, còn N khác = Nữ (vì "Nữ" có thể bị encode sai)
          if (genderRaw.toLowerCase().includes("nam") || firstChar === "M") {
            gender = "Nam";
          } else {
            // Mặc định là Nữ cho tất cả trường hợp còn lại (F, N, Nữ bị encode)
            gender = "Nữ";
          }

          // Chuẩn hóa số điện thoại (loại bỏ khoảng trắng, dấu gạch ngang)
          const phone = (row["Số điện thoại"] || row["phone"] || row["phone_number"]).toString().replace(/[\s-]/g, "");

          // Chuẩn hóa ngày sinh (nếu có)
          let dob = null;
          if (row["Ngày sinh"] || row["dob"]) {
            try {
              const dobStr = row["Ngày sinh"] || row["dob"];
              // Excel có thể trả về date object hoặc string
              if (dobStr instanceof Date) {
                dob = dobStr.toISOString().split("T")[0];
              } else {
                // Parse string date (nhiều format: DD/MM/YYYY, YYYY-MM-DD...)
                const parts = dobStr.toString().split(/[-/]/);
                if (parts.length === 3) {
                  // Assume DD/MM/YYYY if first part <= 31
                  if (parseInt(parts[0]) <= 31) {
                    dob = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
                  } else {
                    // Assume YYYY-MM-DD
                    dob = dobStr;
                  }
                }
              }
            } catch (e) {
              warnings.push({ row: rowNumber, message: "Không parse được ngày sinh, bỏ qua trường này" });
            }
          }

          // Parse số (GPA, khoảng cách)
          const gpa = row["GPA"] || row["gpa"] ? parseFloat(row["GPA"] || row["gpa"]) : null;
          const distance = row["Khoảng cách"] || row["distance"] ? parseInt(row["Khoảng cách"] || row["distance"]) : null;

          // Parse year (năm học) - convert "năm 4" → 4
          let year = row["Năm học"] || row["year"] || 1;
          if (typeof year === "string") {
            const match = year.match(/\d+/);
            year = match ? parseInt(match[0]) : 1;
          } else {
            year = parseInt(year) || 1;
          }

          // ========== BƯỚC 2.3: CHECK TRÙNG LẶP ==========
          console.log("  🔍 Kiểm tra trùng lặp...");
          const existingByEmail = await RegisterFormDAO.findOne({ student_email: studentEmail });
          if (existingByEmail) {
            throw new Error(`Email đã tồn tại trong hệ thống: ${studentEmail}`);
          }

          const studentId = row["Mã SV"] || row["student_id"];
          if (studentId) {
            const existingByStudentId = await RegisterFormDAO.findByStudentId(studentId);
            if (existingByStudentId.length > 0) {
              throw new Error(`Mã sinh viên đã tồn tại: ${studentId}`);
            }
          }

          // ========== BƯỚC 2.4: TÍNH ĐIỂM AI SUGGESTION ==========
          console.log("  🤖 Tính điểm AI suggestion (hệ thống mới)...");
          let aiSuggestion = null;
          let aiScore = null;
          let aiReasoning = null;
          let isGPAFiltered = false;

          // Fetch weights từ settings
          const weights = await this.getScoringWeights();
          console.log(`  ⚖️  Weights: W₁=${weights.w1_priority}, W₂=${weights.w2_year}, W₃=${weights.w3_gpa}`);

          // Chỉ tính nếu có đủ thông tin chính
          if (gpa !== null && year !== undefined) {
            // 1. Tính Priority Score (Điểm Ưu tiên)
            const priorityScore = this.calculatePriorityScore(row["Lý do ưu tiên"] || row["priority_reasons"]);
            console.log(`    ➜ PriorityScore: ${priorityScore}`);

            // 2. Tính Year Score (Điểm Năm học)
            const yearScore = this.calculateYearScore(year);
            console.log(`    ➜ YearScore (Năm ${year}): ${yearScore}`);

            // 3. Tính GPA Score (Điểm GPA)
            const gpaScoreResult = this.calculateGPAScore(gpa);
            if (gpaScoreResult.isFiltered) {
              console.log(`    ➜ GPAScore: ${gpaScoreResult.score} ⛔ FILTERED (${gpaScoreResult.reason})`);
              isGPAFiltered = true;
            } else {
              console.log(`    ➜ GPAScore (${gpa} × 25): ${gpaScoreResult.score}`);
            }

            // 4. Tính Final AI Score
            if (!isGPAFiltered) {
              aiScore = this.calculateFinalAIScore({
                priorityScore: priorityScore,
                yearScore: yearScore,
                gpaScore: gpaScoreResult.score,
                w1: weights.w1_priority,
                w2: weights.w2_year,
                w3: weights.w3_gpa,
              });

              aiSuggestion = this.determineAISuggestion(aiScore);

              aiReasoning = JSON.stringify({
                description: "Hệ thống tính điểm mới (3 thành phần)",
                priority_score: priorityScore,
                year_score: yearScore,
                gpa_score: gpaScoreResult.score,
                weight_priority: weights.w1_priority,
                weight_year: weights.w2_year,
                weight_gpa: weights.w3_gpa,
                formula: `(${priorityScore} × ${weights.w1_priority}) + (${yearScore} × ${weights.w2_year}) + (${gpaScoreResult.score} × ${weights.w3_gpa}) = ${aiScore}`,
              });

              console.log(`  ✨ AI Score: ${aiScore} -> ${aiSuggestion}`);
            } else {
              // GPA < 2.0 → Reject automatically
              aiScore = 0;
              aiSuggestion = "Loại (GPA < 2.0)";
              aiReasoning = JSON.stringify({
                filtered: true,
                reason: "GPA < 2.0",
                min_gpa_required: 2.0,
              });
              console.log(`  ❌ GPA không đạt tiêu chuẩn tối thiểu (2.0)`);
            }
          } else {
            console.log("  ⚠️  Thiếu thông tin GPA hoặc Năm học, không tính AI Score");
          }

          // ========== BƯỚC 2.5: TẠO OBJECT HỒ SƠ ==========
          const registrationId = `reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Parse evidence_images nếu có (CSV có thể là string URL)
          let evidenceImages = null;
          if (row["evidence_images"]) {
            try {
              evidenceImages = JSON.stringify([row["evidence_images"]]);
            } catch (e) {
              evidenceImages = null;
            }
          }

          const registration = {
            id: registrationId,
            student_name: (row["Họ tên"] || row["student_name"]).toString().trim(),
            student_id: studentId || null,
            student_email: studentEmail,
            phone_number: phone,
            gender: gender,
            dob: dob,
            cccd: (row["cccd"] || row["CCCD"] || "").toString().trim() || null,
            address: (row["Địa chỉ"] || row["address"] || "").toString().trim(),
            faculty: (row["Khoa"] || row["faculty"] || "").toString().trim(),
            major: (row["Chuyên ngành"] || row["major"] || "").toString().trim(),
            class: (row["Lớp"] || row["class"] || "").toString().trim(),
            year: year,
            gpa: gpa,
            distance: distance,
            priority_reasons: (row["priority_reasons"] || row["Lý do ưu tiên"] || "").toString().trim(),
            evidence_images: evidenceImages,
            note: (row["note"] || row["Ghi chú"] || "").toString().trim(),
            ai_suggestion: aiSuggestion,
            ai_score: aiScore,
            ai_reasoning: aiReasoning,
            status: "Chờ duyệt",
          };

          // ========== BƯỚC 2.6: LƯU VÀO DATABASE ==========
          console.log("  💾 Lưu vào database...");
          await RegisterFormDAO.create(registration);
          registrations.push(registration);
          console.log(`  ✅ Thành công: ${registration.student_name}`);
        } catch (error) {
          console.log(`  ❌ Lỗi: ${error.message}`);
          errors.push({
            row: rowNumber,
            studentName: row["Họ tên"] || row["student_name"] || "N/A",
            error: error.message,
          });
        }
      }

      // ========== BƯỚC 3: GHI LOG ==========
      console.log("\n📊 BƯỚC 3: Tổng kết và ghi log...");

      // Only log if we have a real user (not 'system')
      if (adminId && adminId !== "system") {
        await LogSystemDAO.log(
          adminId,
          "IMPORT_REGISTRATIONS",
          "register_forms",
          null,
          null,
          {
            success: registrations.length,
            failed: errors.length,
            warnings: warnings.length,
          },
          req,
        );
      }

      console.log(`\n✅ HOÀN TẤT: Import ${registrations.length} hồ sơ thành công!`);
      if (errors.length > 0) {
        console.log(`❌ Có ${errors.length} lỗi:`, errors);
      }
      if (warnings.length > 0) {
        console.log(`⚠️  Có ${warnings.length} cảnh báo:`, warnings);
      }

      return {
        success: registrations.length,
        failed: errors.length,
        total: rawData.length,
        errors,
        warnings,
      };
    } catch (error) {
      console.error("❌ LỖI NGHIÊM TRỌNG:", error.message);
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  /**
   * Get registration statistics
   */
  async getStatistics() {
    try {
      return await RegisterFormDAO.getStatistics();
    } catch (error) {
      throw new Error(`Get statistics failed: ${error.message}`);
    }
  }

  /**
   * Update registration
   */
  async updateRegistration(id, data, adminId, req = null) {
    try {
      const oldData = await RegisterFormDAO.findById(id);
      if (!oldData) {
        throw new Error("Registration not found");
      }

      await RegisterFormDAO.update(id, data);

      // Log action
      await LogSystemDAO.log(adminId, "UPDATE_REGISTRATION", "register_forms", id, oldData, data, req);

      return await RegisterFormDAO.findById(id);
    } catch (error) {
      throw new Error(`Update registration failed: ${error.message}`);
    }
  }
}

module.exports = new RegistrationService();
