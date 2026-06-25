const RegisterFormDAO = require("../dao/RegisterFormDAO");
const LogSystemDAO = require("../dao/LogSystemDAO");
const StudentContractDAO = require("../dao/StudentContractDAO");
const UserDAO = require("../dao/UserDAO");
const bcrypt = require("bcryptjs");
const xlsx = require("xlsx");
const { emitAdminAlert } = require("../socket.js");
const GoogleSheetsService = require("./GoogleSheetsService");
const ImageValidatorService = require("./ImageValidatorService");

class RegistrationService {
  /**
   * ============================================================
   * HỆ THỐNG TÍNH ĐIỂM XÉT TUYỂN TỰ ĐỘNG (ALGORITHMIC SCORING)
   * ============================================================
   *
   * CÔNG THỨC:
   * score = (PriorityScore × W₁) + (YearScore × W₂) + (GPAScore × W₃)
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
   * Lấy cấu hình các trọng số điểm ưu tiên kèm giá trị mặc định
   */
  async getScoringWeights() {
    try {
      const setting = await RegisterFormDAO.getScoringWeightsSettings();

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
   * Lấy bảng điểm quy đổi từ cấu hình
   */
  async getScoreMappings() {
    try {
      const setting = await RegisterFormDAO.getScoringWeightsSettings();

      if (setting && setting.value && setting.value.scoreMappings) {
        return setting.value.scoreMappings;
      }
    } catch (error) {
      console.warn("⚠️ Could not fetch score mappings, using defaults:", error.message);
    }

    // Fallback to defaults
    return {
      priority: {
        absolute_policy: 100,
        priority_area: 70,
        other_objects: 30,
        non_priority: 0,
      },
      priority_detailed: {
        ho_ngheo: 40,
        can_ngheo: 35,
        khuyet_tat: 30,
        liet_sy: 50,
        thuong_binh: 45,
        luu_hoc_sinh: 40,
        vung_sau_xa: 20,
        hai_dao: 25,
        hoan_canh_kho_khan: 30,
        giay_xac_nhan: 15,
      },
      year: {
        year1: 100,
        year2: 60,
        year3: 40,
        year4: 20,
      },
      gpa: {
        conversion_factor: 25,
        min_gpa_filter: 2.0,
      },
    };
  }

  /**
   * Tính toán điểm ưu tiên cộng dồn dựa trên các lý do/diện ưu tiên
   * @param {string} priorityReasons - Chuỗi lý do ưu tiên
   * @param {object} scoreMappings - Bảng điểm quy đổi
   * @returns {number} Điểm ưu tiên (tối đa 100 điểm)
   */
  calculatePriorityScore(priorityReasons, scoreMappings = null) {
    // Use detailed mappings or defaults
    const detailedMappings = scoreMappings?.priority_detailed || {
      ho_ngheo: 40,
      can_ngheo: 35,
      khuyet_tat: 30,
      liet_sy: 50,
      thuong_binh: 45,
      luu_hoc_sinh: 40,
      vung_sau_xa: 20,
      hai_dao: 25,
      hoan_canh_kho_khan: 30,
      giay_xac_nhan: 15,
    };

    if (!priorityReasons || priorityReasons.trim() === "") {
      return 0; // Không thuộc diện ưu tiên
    }

    let totalScore = 0;
    const lowerReason = priorityReasons.toLowerCase();

    // CỘNG ĐIỂM CHO TỪNG CHÍNH SÁCH
    
    // Hộ nghèo
    if (lowerReason.includes("hộ nghèo")) {
      totalScore += detailedMappings.ho_ngheo || 40;
    }
    
    // Cận nghèo
    if (lowerReason.includes("cận nghèo")) {
      totalScore += detailedMappings.can_ngheo || 35;
    }
    
    // Khuyết tật
    if (lowerReason.includes("khuyết tật")) {
      totalScore += detailedMappings.khuyet_tat || 30;
    }
    
    // Con liệt sỹ
    if (lowerReason.includes("liệt sỹ")) {
      totalScore += detailedMappings.liet_sy || 50;
    }
    
    // Con thương binh
    if (lowerReason.includes("thương binh")) {
      totalScore += detailedMappings.thuong_binh || 45;
    }
    
    // Lưu học sinh
    if (lowerReason.includes("lưu học sinh")) {
      totalScore += detailedMappings.luu_hoc_sinh || 40;
    }
    
    // Vùng sâu vùng xa
    if (lowerReason.includes("vùng sâu") || lowerReason.includes("vùng xa") || lowerReason.includes("vùng có điều kiện kinh tế đặc biệt khó khăn")) {
      totalScore += detailedMappings.vung_sau_xa || 20;
    }
    
    // Hải đảo
    if (lowerReason.includes("hải đảo")) {
      totalScore += detailedMappings.hai_dao || 25;
    }
    
    // Hoàn cảnh khó khăn đặc biệt
    if (lowerReason.includes("hoàn cảnh khó khăn đặc biệt")) {
      totalScore += detailedMappings.hoan_canh_kho_khan || 30;
    }
    
    // Giấy xác nhận ưu tiên khác
    if (lowerReason.includes("giấy xác nhận ưu tiên") || lowerReason.includes("ưu tiên khác")) {
      totalScore += detailedMappings.giay_xac_nhan || 15;
    }

    // Giới hạn tối đa 100 điểm
    return Math.min(totalScore, 100);
  }

  /**
   * Tính toán điểm năm học
   * @param {number} year - Năm học (1-4)
   * @param {object} scoreMappings - Bảng điểm quy đổi
   * @returns {number} Điểm năm học (0-100)
   */
  calculateYearScore(year, scoreMappings = null) {
    // Use defaults if no mappings provided
    const mappings = scoreMappings?.year || {
      year1: 100,
      year2: 60,
      year3: 40,
      year4: 20,
    };

    switch (year) {
      case 1:
        return mappings.year1;
      case 2:
        return mappings.year2;
      case 3:
        return mappings.year3;
      case 4:
        return mappings.year4;
      default:
        return 0; // Invalid year
    }
  }

  /**
   * Tính toán điểm tích lũy GPA
   * Công thức: GPA × hệ số quy đổi (mặc định 25 cho hệ 4.0)
   * Trường hợp đặc biệt: Sinh viên năm 1 chưa có điểm GPA sẽ được mặc định 50 điểm
   * @param {number} gpa - Điểm GPA tích lũy
   * @param {number} year - Năm học (1-4)
   * @param {object} scoreMappings - Bảng điểm quy đổi
   * @returns {object} { score: number, isFiltered: boolean }
   */
  calculateGPAScore(gpa, year = null, scoreMappings = null) {
    // Use defaults if no mappings provided
    const mappings = scoreMappings?.gpa || {
      conversion_factor: 25,
      min_gpa_filter: 2.0,
    };

    // Special case: Year 1 students with GPA = 0
    // They haven't studied any courses yet, so GPA = 0 is reasonable
    // Give them a neutral score of 50 (equivalent to GPA 2.0)
    if (year === 1 && (gpa === 0 || gpa === null)) {
      return {
        score: 50,
        isFiltered: false,
        reason: "Năm 1: Chưa có điểm GPA, tính điểm trung bình",
      };
    }

    // GPA filtering: reject if < min_gpa_filter (but not for year 1 students)
    if (gpa !== null && gpa < mappings.min_gpa_filter) {
      return {
        score: 0,
        isFiltered: true,
        reason: `GPA < ${mappings.min_gpa_filter}`,
      };
    }

    if (gpa === null || gpa === undefined) {
      return {
        score: 0,
        isFiltered: false,
      };
    }

    // Formula: GPA × conversion_factor
    const score = Math.min(gpa * mappings.conversion_factor, 100); // Cap at 100
    return {
      score: Math.round(score),
      isFiltered: false,
    };
  }

  /**
   * Phân nhóm hồ sơ xét tuyển (Hệ thống 3 nhóm - 3 Baskets)
   * @param {string} priorityReasons - Các lý do ưu tiên
   * @param {number} year - Năm học
   * @returns {number} Nhóm hồ sơ (1, 2, hoặc 3)
   */
  determineBasket(priorityReasons, year) {
    // Nhóm 1: Chính sách - chỉ khi priority_reasons chứa keyword ưu tiên thực sự
    // Không dùng check rỗng/không rỗng vì Google Sheets có thể trả về
    // các giá trị như "Không có", "Không thuộc diện ưu tiên", v.v.
    if (priorityReasons && priorityReasons.trim() !== "") {
      const lowerReason = priorityReasons.toLowerCase();
      const hasPriority =
        lowerReason.includes("hộ nghèo") ||
        lowerReason.includes("cận nghèo") ||
        lowerReason.includes("thương binh") ||
        lowerReason.includes("liệt sỹ") ||
        lowerReason.includes("khuyết tật") ||
        lowerReason.includes("lưu học sinh") ||
        lowerReason.includes("hoàn cảnh khó khăn đặc biệt") ||
        lowerReason.includes("vùng sâu") ||
        lowerReason.includes("vùng xa") ||
        lowerReason.includes("hải đảo") ||
        lowerReason.includes("vùng có điều kiện kinh tế đặc biệt khó khăn") ||
        lowerReason.includes("giấy xác nhận ưu tiên") ||
        lowerReason.includes("ưu tiên khác");

      if (hasPriority) {
        return 1;
      }
    }

    // Nhóm 2: Tân sinh viên (năm 1, không có chính sách)
    if (year === 1) {
      return 2;
    }

    // Nhóm 3: Khóa cũ (năm 2, 3, 4, không có chính sách)
    return 3;
  }

  /**
   * Lấy cấu hình các trọng số đặc thù cho từng nhóm hồ sơ
   * Mỗi nhóm có sự ưu tiên khác nhau:
   * - Nhóm 1 (Chính sách): Ưu tiên gia cảnh > Năm học > GPA
   * - Nhóm 2 (Tân SV): Năm học > Ưu tiên gia cảnh > GPA
   * - Nhóm 3 (Khóa cũ): GPA > Năm học > Ưu tiên gia cảnh
   * @param {number} basket - Số hiệu nhóm hồ sơ (1, 2, hoặc 3)
   * @returns {object} Trọng số { w1_priority, w2_year, w3_gpa }
   */
  async getBasketWeights(basket) {
    try {
      const setting = await RegisterFormDAO.getScoringWeightsSettings();

      if (setting && setting.value && setting.value.weights) {
        const weights = setting.value.weights;

        // Check if it's 3-basket structure
        if (weights.basket1 || weights.basket2 || weights.basket3) {
          const basketKey = `basket${basket}`;
          if (weights[basketKey]) {
            return {
              w1_priority: weights[basketKey].w1_priority,
              w2_year: weights[basketKey].w2_year,
              w3_gpa: weights[basketKey].w3_gpa,
            };
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not fetch basket ${basket} weights, using defaults:`, error.message);
    }

    // Fallback to defaults if not found
    const basketWeights = {
      1: { w1_priority: 0.4, w2_year: 0.3, w3_gpa: 0.3 }, // Chính sách
      2: { w1_priority: 0.2, w2_year: 0.5, w3_gpa: 0.3 }, // Tân SV
      3: { w1_priority: 0.1, w2_year: 0.2, w3_gpa: 0.7 }, // Khóa cũ
    };
    return basketWeights[basket] || basketWeights[3];
  }

  /**
   * Tính toán điểm AI xét tuyển cuối cùng (thang điểm 100)
   * Sử dụng các trọng số tương ứng của từng nhóm
   * @param {object} params - { priorityScore, yearScore, gpaScore, basket, weights }
   * @returns {number} Điểm AI tổng hợp (0-100)
   */
  calculateFinalAIScore(params) {
    const { priorityScore, yearScore, gpaScore, weights } = params;

    // Calculate score with basket-specific formula
    const score = priorityScore * weights.w1_priority + yearScore * weights.w2_year + gpaScore * weights.w3_gpa;

    return Math.round(score);
  }

  /**
   * Đưa ra đề xuất AI (AI Suggestion) dựa trên điểm số và nhóm hồ sơ
   * Mỗi nhóm có ngưỡng điểm sàn đề xuất khác nhau
   * @param {number} score - Điểm xét tuyển AI (0-100)
   * @param {number} basket - Nhóm hồ sơ (1, 2, hoặc 3)
   * @returns {string} Đề xuất xét duyệt của AI
   */
  determineAISuggestion(score, basket) {
    // Nhóm 1 (Chính sách): Nới lỏng tiêu chuẩn vì ưu tiên hoàn cảnh
    // Nhóm 2 (Tân SV): Nới lỏng vì chưa có điểm GPA
    // Nhóm 3 (Khóa cũ): Chặt chẽ hơn vì có GPA
    const thresholds = {
      1: { high: 70, medium: 50 }, // Chính sách: Dễ duyệt hơn
      2: { high: 75, medium: 55 }, // Tân SV: Dễ duyệt
      3: { high: 80, medium: 65 }, // Khóa cũ: Yêu cầu cao hơn
    };

    const threshold = thresholds[basket] || thresholds[3];

    if (score >= threshold.high) {
      return "Nên duyệt";
    } else if (score >= threshold.medium) {
      return "Cân nhắc";
    } else {
      return "Không ưu tiên";
    }
  }
  /**
   * Lấy danh sách toàn bộ hồ sơ đăng ký kèm bộ lọc
   * Kết quả sắp xếp theo: Nhóm (1 → 2 → 3) rồi đến Điểm AI xét tuyển từ cao xuống thấp
   * Đánh dấu hồ sơ vượt quá chỉ tiêu là "isFull = true"
   */
  async getRegistrations(filters = {}) {
    try {
      const registrations = await RegisterFormDAO.searchAndFilter(filters);

      // Sort by Basket first, then by AI Score (which already includes basket bonus)
      // This ensures: Nhóm 1 (Chính sách) > Nhóm 2 (Tân SV) > Nhóm 3 (Khóa cũ)
      registrations.sort((a, b) => {
        // Extract basket from ai_reasoning JSON
        let aBasket = 3; // Default to Nhóm 3 if can't determine
        let bBasket = 3;

        try {
          if (a.ai_reasoning) {
            const aReasoning = JSON.parse(a.ai_reasoning);
            aBasket = aReasoning.basket || this.determineBasket(a.priority_reasons, a.year);
          } else {
            aBasket = this.determineBasket(a.priority_reasons, a.year);
          }
        } catch (e) {
          aBasket = this.determineBasket(a.priority_reasons, a.year);
        }

        try {
          if (b.ai_reasoning) {
            const bReasoning = JSON.parse(b.ai_reasoning);
            bBasket = bReasoning.basket || this.determineBasket(b.priority_reasons, b.year);
          } else {
            bBasket = this.determineBasket(b.priority_reasons, b.year);
          }
        } catch (e) {
          bBasket = this.determineBasket(b.priority_reasons, b.year);
        }

        // 1. First: Sort by Basket (lower basket number = higher priority)
        if (aBasket !== bBasket) {
          return aBasket - bBasket; // Nhóm 1 < Nhóm 2 < Nhóm 3
        }

        // 2. Within same basket: Sort by AI Score (higher is better)
        return (b.ai_score || 0) - (a.ai_score || 0);
      });

      // Check for full slots per basket and mark registrations accordingly
      try {
        const setting = await RegisterFormDAO.getScoringWeightsSettings();
        let totalSlots = 1000; // Default
        let quotas = {
          policy_priority: 0,
          freshmen: 60,
          seniors: 40,
        };

        if (setting && setting.value && setting.value.quotas) {
          if (setting.value.quotas.totalSlots) {
            totalSlots = setting.value.quotas.totalSlots;
          }
          if (setting.value.quotas.policy_priority !== undefined) {
            quotas.policy_priority = setting.value.quotas.policy_priority;
          }
          if (setting.value.quotas.freshmen !== undefined) {
            quotas.freshmen = setting.value.quotas.freshmen;
          }
          if (setting.value.quotas.seniors !== undefined) {
            quotas.seniors = setting.value.quotas.seniors;
          }
        }

        // Calculate slots per academic year quota
        const slotsPerQuota = {
          freshmen: Math.round((quotas.freshmen / 100) * totalSlots),
          seniors: Math.round((quotas.seniors / 100) * totalSlots),
        };

        console.log(`📊 Slot allocation: Tân SV (Nhóm 1+2)=${slotsPerQuota.freshmen}, Khóa cũ (Nhóm 1+3)=${slotsPerQuota.seniors} (Total: ${totalSlots})`);

        // Count pending registrations per academic year quota
        const quotaCounts = { freshmen: 0, seniors: 0 };

        registrations.forEach((reg) => {
          // Only count pending registrations
          if (reg.status === "Chờ duyệt") {
            const quotaKey = reg.year === 1 ? "freshmen" : "seniors";
            
            // Increment count for this quota key
            quotaCounts[quotaKey]++;

            // Mark as full if this quota key has exceeded its limit
            reg.isFull = quotaCounts[quotaKey] > slotsPerQuota[quotaKey];
          } else {
            reg.isFull = false;
          }
        });

        console.log(`📊 Registration counts: Tân SV=${quotaCounts.freshmen}, Khóa cũ=${quotaCounts.seniors}`);
      } catch (error) {
        console.warn("⚠️ Could not check slot capacity:", error.message);
        // If error, don't mark any as full
        registrations.forEach((reg) => {
          reg.isFull = false;
        });
      }

      return registrations;
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
   * Tạo mới một hồ sơ đăng ký (xác thực dữ liệu và chấm điểm AI tự động)
   *
   * Quy trình:
   * 1. Kiểm tra tính hợp lệ của dữ liệu đầu vào
   * 2. Kiểm tra trùng lặp mã sinh viên (student_id)
   * 3. Tính toán các điểm số thành phần
   * 4. Phân nhóm hồ sơ và đưa ra gợi ý AI
   * 5. Tạo đối tượng giải trình lý do chấm điểm AI
   * 6. Lưu vào cơ sở dữ liệu
   * 7. Ghi nhật ký hoạt động hệ thống
   *
   * @param {object} data - Dữ liệu hồ sơ
   * @param {object} req - Đối tượng request Express
   * @returns {object} Hồ sơ được tạo kèm điểm số và gợi ý AI
   */
  async createRegistration(data, req = null) {
    try {
      // ============================================
      // STEP 1: INPUT VALIDATION
      // ============================================
      const requiredFields = ["student_name", "student_id", "student_email", "phone_number", "dob", "gender", "cccd", "faculty", "major", "class", "year", "address"];

      const missingFields = [];
      for (const field of requiredFields) {
        if (!data[field] || (typeof data[field] === "string" && data[field].trim() === "")) {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      // Validate field formats
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.student_email)) {
        throw new Error("Invalid student email format");
      }

      // Phone number validation (Vietnamese format: 0xxxxxxxxx)
      const phoneRegex = /^0\d{9,10}$/;
      if (!phoneRegex.test(data.phone_number.replace(/[\s-]/g, ""))) {
        throw new Error("Invalid phone number format");
      }

      // Year validation
      const year = parseInt(data.year);
      if (![1, 2, 3, 4].includes(year)) {
        throw new Error("Invalid year. Must be 1-4");
      }

      // Gender validation
      const validGenders = ["Nam", "Nữ", "Khác"];
      if (!validGenders.includes(data.gender)) {
        throw new Error("Invalid gender. Must be Nam, Nữ, or Khác");
      }

      // GPA validation
      let gpa = 0;
      if (data.gpa !== undefined && data.gpa !== null && data.gpa !== "") {
        gpa = parseFloat(data.gpa);
        if (isNaN(gpa) || gpa < 0 || gpa > 4.0) {
          throw new Error("Invalid GPA. Must be between 0 and 4.0");
        }
      }

      // ============================================
      // STEP 2: CHECK FOR DUPLICATE STUDENT_ID
      // ============================================
      const existingReg = await RegisterFormDAO.findByStudentId(data.student_id);
      if (existingReg && existingReg.length > 0) {
        throw new Error(`Registration with student_id "${data.student_id}" already exists`);
      }

      // ============================================
      // STEP 3: CALCULATE AI SCORES
      // ============================================
      console.log(`\n📊 Calculating AI scores for ${data.student_name}...`);

      // Get scoring mappings
      const scoreMappings = await this.getScoreMappings();

      // 3.1: Calculate component scores
      const priorityScore = this.calculatePriorityScore(data.priority_reasons, scoreMappings);
      const yearScore = this.calculateYearScore(year, scoreMappings);
      const gpaScoreObj = this.calculateGPAScore(gpa, year, scoreMappings);
      const gpaScore = gpaScoreObj.score;

      console.log(`   Priority Score: ${priorityScore}`);
      console.log(`   Year Score: ${yearScore}`);
      console.log(`   GPA Score: ${gpaScore}`);

      // 3.2: Determine basket
      const basket = this.determineBasket(data.priority_reasons, year);
      console.log(`   Basket: ${basket}`);

      // 3.3: Get basket-specific weights
      const weights = await this.getBasketWeights(basket);
      console.log(`   Weights: W1=${weights.w1_priority}, W2=${weights.w2_year}, W3=${weights.w3_gpa}`);

      // 3.4: Calculate final AI score
      const finalAIScore = this.calculateFinalAIScore({
        priorityScore,
        yearScore,
        gpaScore,
        basket,
        weights,
      });

      console.log(`   Final AI Score: ${finalAIScore}`);

      // ============================================
      // STEP 4: DETERMINE AI SUGGESTION
      // ============================================
      const aiSuggestion = this.determineAISuggestion(finalAIScore, basket);
      console.log(`   AI Suggestion: ${aiSuggestion}`);

      // ============================================
      // STEP 5: CREATE AI REASONING OBJECT
      // ============================================
      const basketNames = {
        1: "Chính sách (Policy)",
        2: "Tân sinh viên (Freshmen)",
        3: "Sinh viên khóa cũ (Seniors)",
      };

      const thresholds = {
        1: { high: 70, medium: 50 },
        2: { high: 75, medium: 55 },
        3: { high: 80, medium: 65 },
      };

      const aiReasoning = {
        basket,
        basketName: basketNames[basket],
        priorityScore,
        priorityReason: data.priority_reasons || "Không có lý do ưu tiên",
        yearScore,
        yearValue: year,
        yearName: `Năm ${year}`,
        gpaScore,
        gpaValue: gpa,
        gpaReason: gpaScoreObj.reason || `GPA × 25 = ${gpa} × 25 = ${gpaScore}`,
        weights: {
          w1_priority: weights.w1_priority,
          w2_year: weights.w2_year,
          w3_gpa: weights.w3_gpa,
        },
        formula: `${weights.w1_priority}×${priorityScore} + ${weights.w2_year}×${yearScore} + ${weights.w3_gpa}×${gpaScore} = ${finalAIScore}`,
        threshold: thresholds[basket],
        calculatedAt: new Date().toISOString(),
      };

      // ============================================
      // STEP 6: SAVE TO DATABASE
      // ============================================
      const registrationId = `reg-${Date.now()}`;

      const registrationData = {
        id: registrationId,
        student_name: data.student_name,
        student_id: data.student_id,
        student_email: data.student_email,
        phone_number: data.phone_number.replace(/[\s-]/g, ""), // Normalize phone
        gender: data.gender,
        dob: data.dob,
        cccd: data.cccd,
        address: data.address,
        faculty: data.faculty,
        major: data.major,
        class: data.class,
        year: year,
        gpa: gpa || null,
        distance: data.distance || null,
        priority_reasons: data.priority_reasons || null,
        status: "Chờ duyệt", // Pending
        ai_score: finalAIScore,
        ai_suggestion: aiSuggestion,
        ai_reasoning: aiReasoning,
        evidence_images: data.evidence_images ? [data.evidence_images] : null,
        note: data.note || null,
        reviewed_by: null,
        reviewed_at: null,
      };

      const registration = await RegisterFormDAO.create(registrationData);
      console.log(`✅ Registration created: ${registrationId}`);

      // ============================================
      // STEP 7: LOG ACTION
      // ============================================
      if (req && req.user) {
        await LogSystemDAO.log(req.user.userId, "CREATE_REGISTRATION", "register_forms", registrationId, null, registrationData, req);
      }

      // Notify admins real-time
      emitAdminAlert("new_registration", {
        id: registrationId,
        student_name: data.student_name,
        student_id: data.student_id,
        faculty: data.faculty,
        ai_suggestion: aiSuggestion,
      });

      // ===== TRIGGER VISION VALIDATION ASYNC (single registration) =====
      if (registrationData.evidence_images) {
        ImageValidatorService.validateRegistrationImages(registrationId, req?.user?.userId || "system").catch((err) => console.error("❌ validateRegistrationImages error:", err.message));
      }

      return registration;
    } catch (error) {
      console.error(`❌ Create registration failed: ${error.message}`);
      throw new Error(`Create registration failed: ${error.message}`);
    }
  }

  /**
   * Phê duyệt hồ sơ đăng ký phòng
   */
  async approveRegistration(id, adminId, note = null, req = null) {
    try {
      const oldData = await RegisterFormDAO.findById(id);
      if (!oldData) {
        throw new Error("Registration not found");
      }

      if (oldData.status !== "Chờ duyệt") {
        throw new Error("Chỉ duyệt được hồ sơ ở trạng thái Chờ duyệt");
      }

      await RegisterFormDAO.updateStatus(id, "Chấp nhận", adminId, note);

      // ================================================================
      // Tạo tài khoản sinh viên nếu chưa có, sau đó tạo Hợp đồng Pending
      // ================================================================
      let userId;
      try {
        // Tìm user theo email sinh viên
        const email = oldData.student_email || oldData.email;
        let existingUser = email ? await UserDAO.findByEmail(email) : null;

        if (!existingUser) {
          // Tạo tài khoản sinh viên với mật khẩu mặc định là số CCCD (giống fake-student-contracts.js)
          const defaultPwd = oldData.cccd || oldData.student_id || "123456";
          const hashed = await bcrypt.hash(defaultPwd, 6);
          const newUserId = `user-${Date.now()}`;
          existingUser = await UserDAO.create({
            id: newUserId,
            email: email || `${newUserId}@ktx.edu.vn`,
            password: hashed,
            full_name: oldData.student_name,
            role: "STUDENT",
            phone: oldData.phone_number || null,
          });
        }
        userId = existingUser.id;

        // Kiểm tra đã có contract Pending/Active chưa
        const existingContract = await StudentContractDAO.findOne({ register_form_id: id });
        if (!existingContract) {
          const contractId = `contract-${Date.now()}`;
          const contractNumber = `HD-PENDING-${Date.now()}`;

          // Ngày bắt đầu = 7 ngày sau ngày nộp hồ sơ
          // Ngày kết thúc = ngày bắt đầu + 6 tháng
          const submittedAt = new Date(oldData.created_at || Date.now());
          const startDate = new Date(submittedAt);
          startDate.setDate(startDate.getDate() + 7);
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 6);

          await StudentContractDAO.createPendingContract({
            id: contractId,
            contract_number: contractNumber,
            user_id: userId,
            room_id: null,
            register_form_id: id,
            status: "Pending",
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
            // Snapshot
            snapshot_student_id: oldData.student_id || null,
            snapshot_cccd: oldData.cccd || null,
            snapshot_gender: oldData.gender || null,
            snapshot_year: oldData.year || null,
            snapshot_faculty: oldData.faculty || null,
            snapshot_phone: oldData.phone_number || null,
            // Giá thuê mặc định 0, sẽ cập nhật khi gán phòng
            rent_price: 0,
            deposit_amount: 500000,
            created_by: adminId,
          });
        }
      } catch (contractErr) {
        // Không nên làm fail toàn bộ approve vì lỗi tạo contract
        console.error("⚠️ Tạo pending contract thất bại:", contractErr.message);
      }

      // Log action
      await LogSystemDAO.log(adminId, "APPROVE_REGISTRATION", "register_forms", id, { status: oldData.status }, { status: "Chấp nhận", note }, req);

      return await RegisterFormDAO.findById(id);
    } catch (error) {
      throw new Error(`Approve registration failed: ${error.message}`);
    }
  }

  /**
   * Từ chối hồ sơ đăng ký phòng
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
   * Xóa hồ sơ đăng ký phòng
   * @param {string} id - ID hồ sơ
   * @param {string} adminId - ID người thực hiện
   * @param {object} req - Đối tượng request Express để ghi nhật ký
   * @returns {object} Dữ liệu hồ sơ bị xóa
   */
  async deleteRegistration(id, adminId, req = null) {
    try {
      // Find the registration first
      const oldData = await RegisterFormDAO.findById(id);
      if (!oldData) {
        throw new Error("Registration not found");
      }

      // Delete from database
      await RegisterFormDAO.delete(id);

      // Log action
      if (req && req.user) {
        await LogSystemDAO.log(adminId, "DELETE_REGISTRATION", "register_forms", id, oldData, null, req);
      }

      return oldData;
    } catch (error) {
      throw new Error(`Delete registration failed: ${error.message}`);
    }
  }

  /**
   * Xử lý 1 row dữ liệu (dùng chung cho cả CSV và Google Sheets)
   * validate → normalize → check duplicate → tính điểm AI → lưu DB
   * @param {object} row - Object với key là tên cột
   * @param {number} rowNumber - Số thứ tự dòng (để log lỗi)
   * @param {Array} warnings - Mảng warnings để push vào
   * @returns {object} registration object đã lưu
   */
  async _processRow(row, rowNumber, warnings) {
    console.log(`\n--- Xử lý dòng ${rowNumber} ---`);

    // ===== VALIDATE =====
    const validationErrors = [];
    if (!row["Họ tên"] && !row["student_name"]) validationErrors.push("Thiếu họ tên");
    if (!row["Email"] && !row["email"] && !row["student_email"]) validationErrors.push("Thiếu email");
    if (!row["Số điện thoại"] && !row["phone"] && !row["phone_number"]) validationErrors.push("Thiếu số điện thoại");
    if (!row["Giới tính"] && !row["gender"]) validationErrors.push("Thiếu giới tính");
    if (validationErrors.length > 0) throw new Error(`Dữ liệu không hợp lệ: ${validationErrors.join(", ")}`);

    // ===== NORMALIZE =====
    console.log("  📝 Chuẩn hóa dữ liệu...");

    const studentEmail = (row["student_email"] || row["Email"] || row["email"]).toString().trim().toLowerCase();

    let genderRaw = (row["Giới tính"] || row["gender"]).toString().trim();
    let gender;
    if (genderRaw.toLowerCase().includes("nam") || genderRaw.charAt(0).toUpperCase() === "M") {
      gender = "Nam";
    } else {
      gender = "Nữ";
    }

    const phone = (row["Số điện thoại"] || row["phone"] || row["phone_number"]).toString().replace(/[\s-]/g, "");

    let dob = null;
    if (row["Ngày sinh"] || row["dob"]) {
      try {
        const dobStr = row["Ngày sinh"] || row["dob"];
        if (dobStr instanceof Date) {
          dob = dobStr.toISOString().split("T")[0];
        } else {
          const parts = dobStr.toString().split(/[-/]/);
          if (parts.length === 3) {
            if (parseInt(parts[0]) <= 31) {
              dob = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            } else {
              dob = dobStr;
            }
          }
        }
      } catch (e) {
        warnings.push({ row: rowNumber, message: "Không parse được ngày sinh, bỏ qua trường này" });
      }
    }

    const gpa = row["GPA"] || row["gpa"] ? parseFloat(row["GPA"] || row["gpa"]) : null;
    const distance = row["Khoảng cách"] || row["distance"] ? parseInt(row["Khoảng cách"] || row["distance"]) : null;

    let year = row["Năm học"] || row["year"] || 1;
    if (typeof year === "string") {
      const match = year.match(/\d+/);
      year = match ? parseInt(match[0]) : 1;
    } else {
      year = parseInt(year) || 1;
    }

    // ===== CHECK DUPLICATE =====
    console.log("  🔍 Kiểm tra trùng lặp...");
    const existingByEmail = await RegisterFormDAO.findOne({ student_email: studentEmail });
    if (existingByEmail) throw new Error(`Email đã tồn tại trong hệ thống: ${studentEmail}`);

    const studentId = row["Mã SV"] || row["student_id"] || null;
    if (studentId) {
      const existingByStudentId = await RegisterFormDAO.findByStudentId(studentId);
      if (existingByStudentId.length > 0) throw new Error(`Mã sinh viên đã tồn tại: ${studentId}`);
    }

    // ===== AI SCORING =====
    console.log("  🤖 Tính điểm AI suggestion...");
    let aiSuggestion = null;
    let aiScore = null;
    let aiReasoning = null;

    if (gpa !== null && year !== undefined) {
      const priorityRaw = (row["Lý do ưu tiên"] || row["priority_reasons"] || "").toString().trim();

      const basket = this.determineBasket(priorityRaw, year);
      const basketName = basket === 1 ? "Chính sách" : basket === 2 ? "Tân sinh viên" : "Khóa cũ";
      console.log(`    ➜ Basket: Nhóm ${basket} (${basketName})`);

      const weights = await this.getBasketWeights(basket);
      console.log(`    ⚖️  Weights (Nhóm ${basket}): Priority=${weights.w1_priority}, Year=${weights.w2_year}, GPA=${weights.w3_gpa}`);

      const scoreMappings = await this.getScoreMappings();

      const priorityScore = this.calculatePriorityScore(priorityRaw, scoreMappings);
      console.log(`    ➜ PriorityScore: ${priorityScore}`);

      const yearScore = this.calculateYearScore(year, scoreMappings);
      console.log(`    ➜ YearScore (Năm ${year}): ${yearScore}`);

      const gpaScoreResult = this.calculateGPAScore(gpa, year, scoreMappings);
      if (gpaScoreResult.isFiltered) {
        console.log(`    ➜ GPAScore: ${gpaScoreResult.score} ⛔ FILTERED (${gpaScoreResult.reason})`);
        aiScore = 0;
        aiSuggestion = "Không ưu tiên";
        aiReasoning = JSON.stringify({
          filtered: true,
          reason: "GPA < 2.0 - Không đạt tiêu chuẩn tối thiểu",
          min_gpa_required: 2.0,
          actual_gpa: gpa,
        });
        console.log(`  ❌ GPA không đạt tiêu chuẩn tối thiểu (2.0) - Đánh giá: Không ưu tiên`);
      } else {
        const scoreExplanation = gpaScoreResult.reason || `${gpa} × 25`;
        console.log(`    ➜ GPAScore (${scoreExplanation}): ${gpaScoreResult.score}`);

        aiScore = this.calculateFinalAIScore({
          priorityScore,
          yearScore,
          gpaScore: gpaScoreResult.score,
          weights,
        });
        aiSuggestion = this.determineAISuggestion(aiScore, basket);
        aiReasoning = JSON.stringify({
          description: "Hệ thống tính điểm theo Nhóm (mỗi nhóm có trọng số riêng)",
          basket,
          basket_name: basketName,
          priority_score: priorityScore,
          year_score: yearScore,
          gpa_score: gpaScoreResult.score,
          basket_weights: weights,
          final_score: aiScore,
          formula: `(${priorityScore} × ${weights.w1_priority}) + (${yearScore} × ${weights.w2_year}) + (${gpaScoreResult.score} × ${weights.w3_gpa}) = ${aiScore}`,
        });
        console.log(`  ✨ AI Score: ${aiScore} -> ${aiSuggestion} (Nhóm ${basket})`);
      }
    } else {
      console.log("  ⚠️  Thiếu thông tin GPA hoặc Năm học, không tính AI Score");
    }

    // ===== BUILD RECORD =====
    const registrationId = `reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // evidence_images: hỗ trợ cả CSV (1 URL) và Sheets (nhiều URL cách nhau bởi dấu phẩy/xuống dòng)
    let evidenceImages = null;
    const imgRaw = row["Ảnh minh chứng"] || row["evidence_images"] || row["Ảnh"] || row["Minh chứng"] || "";
    if (imgRaw && imgRaw.toString().trim() !== "") {
      const imgLinks = imgRaw
        .toString()
        .split(/,|\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      evidenceImages = JSON.stringify(imgLinks);
    }

    const registration = {
      id: registrationId,
      student_name: (row["Họ tên"] || row["student_name"]).toString().trim(),
      student_id: studentId || null,
      student_email: studentEmail,
      phone_number: phone,
      gender,
      dob,
      cccd: (row["cccd"] || row["CCCD"] || "").toString().trim() || null,
      address: (row["Địa chỉ"] || row["address"] || "").toString().trim(),
      faculty: (row["Khoa"] || row["faculty"] || "").toString().trim(),
      major: (row["Chuyên ngành"] || row["major"] || "").toString().trim(),
      class: (row["Lớp"] || row["class"] || "").toString().trim(),
      year,
      gpa,
      distance,
      priority_reasons: (row["priority_reasons"] || row["Lý do ưu tiên"] || "").toString().trim(),
      evidence_images: evidenceImages,
      note: (row["note"] || row["Ghi chú"] || "").toString().trim(),
      ai_suggestion: aiSuggestion,
      ai_score: aiScore,
      ai_reasoning: aiReasoning,
      status: "Chờ duyệt",
    };

    // ===== LƯU DB =====
    console.log("  💾 Lưu vào database...");
    await RegisterFormDAO.create(registration);
    console.log(`  ✅ Thành công: ${registration.student_name}`);
    return registration;
  }

  /**
   * Import registrations from Excel file
   * @param {string} filePath - Đường dẫn file Excel đã upload
   * @param {string} adminId - ID của admin thực hiện import
   * @param {object} req - Request object để log
   * @returns {object} Kết quả import: { success, failed, total, errors, warnings }
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
          const registration = await this._processRow(row, rowNumber, warnings);
          registrations.push(registration);
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

      // ===== TRIGGER VISION VALIDATION ASYNC =====
      const idsToValidate = registrations.map((r) => r.id).filter(Boolean);
      if (idsToValidate.length > 0) {
        console.log(`🔍 Bắt đầu xác thực ảnh async cho ${idsToValidate.length} hồ sơ...`);
        // Không await - chạy nền, không block response
        ImageValidatorService.validateBatch(idsToValidate, adminId).catch((err) => console.error("❌ validateBatch error:", err.message));
      }

      return {
        success: registrations.length,
        failed: errors.length,
        total: rawData.length,
        errors,
        warnings,
        visionValidation: idsToValidate.length > 0 ? "processing" : "skipped",
      };
    } catch (error) {
      console.error("❌ LỖI NGHIÊM TRỌNG:", error.message);
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  /**
   * Import registrations from Google Sheets
   *
   * Tái sử dụng toàn bộ logic xử lý hàng từ importFromExcel:
   * validate → normalize → check duplicate → tính điểm AI → lưu DB
   *
   * @param {string} sheetUrl - URL Google Sheets
   * @param {string} adminId - ID admin thực hiện
   * @param {object} req - Express request object
   * @returns {object} { success, failed, total, errors, warnings }
   */
  async importFromGoogleSheets(sheetUrl, adminId, req = null) {
    try {
      console.log("🌐 BƯỚC 1: Đọc dữ liệu từ Google Sheets...");
      const rawData = await GoogleSheetsService.readSheet(sheetUrl);
      console.log(`✅ Đọc được ${rawData.length} hàng từ Google Sheets`);

      const registrations = [];
      const errors = [];
      const warnings = [];

      console.log("\n🔄 BƯỚC 2: Xử lý từng hàng dữ liệu...\n");

      for (let i = 0; i < rawData.length; i++) {
        const rowNumber = i + 2;
        const row = rawData[i];
        try {
          const registration = await this._processRow(row, rowNumber, warnings);
          registrations.push(registration);
        } catch (error) {
          console.log(`  ❌ Lỗi hàng ${rowNumber}: ${error.message}`);
          errors.push({
            row: rowNumber,
            studentName: row["Họ tên"] || row["student_name"] || "N/A",
            error: error.message,
          });
        }
      }

      // ===== LOG =====
      if (adminId && adminId !== "system") {
        await LogSystemDAO.log(adminId, "IMPORT_REGISTRATIONS_SHEETS", "register_forms", null, null, { success: registrations.length, failed: errors.length, source: "google_sheets", sheetUrl }, req);
      }

      console.log(`\n✅ HOÀN TẤT: Import ${registrations.length} hồ sơ từ Sheets thành công!`);
      if (errors.length > 0) console.log(`❌ Có ${errors.length} lỗi:`, errors);

      // ===== TRIGGER VISION VALIDATION ASYNC =====
      const idsToValidate = registrations.map((r) => r.id).filter(Boolean);
      if (idsToValidate.length > 0) {
        console.log(`🔍 Bắt đầu xác thực ảnh async cho ${idsToValidate.length} hồ sơ...`);
        // Không await - chạy nền, không block response
        ImageValidatorService.validateBatch(idsToValidate, adminId).catch((err) => console.error("❌ validateBatch error:", err.message));
      }

      return {
        success: registrations.length,
        failed: errors.length,
        total: rawData.length,
        errors,
        warnings,
        source: "google_sheets",
        visionValidation: idsToValidate.length > 0 ? "processing" : "skipped",
      };
    } catch (error) {
      console.error("❌ LỖI NGHIÊM TRỌNG (Sheets):", error.message);
      throw new Error(`Import Google Sheets failed: ${error.message}`);
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
   * Recalculate AI scores for all registrations
   * This is used when admin changes scoring weights/settings
   */
  async recalculateAllScores(adminId, req = null) {
    try {
      console.log("🔄 BƯỚC 1: Lấy tất cả hồ sơ đăng ký...");

      // Get all registrations (not just pending ones, to update statistics)
      const allRegistrations = await RegisterFormDAO.findAll();
      console.log(`✅ Tìm thấy ${allRegistrations.length} hồ sơ`);

      // Fetch current scoring weights
      const weights = await this.getScoringWeights();
      console.log(`⚖️  Weights: W₁=${weights.w1_priority}, W₂=${weights.w2_year}, W₃=${weights.w3_gpa}`);

      const updated = [];
      const skipped = [];

      console.log("\n🔄 BƯỚC 2: Tính lại điểm cho từng hồ sơ...\n");

      for (const reg of allRegistrations) {
        try {
          // Skip if missing critical data
          if (reg.gpa === null || reg.year === undefined) {
            skipped.push({ id: reg.id, reason: "Thiếu GPA hoặc Year" });
            continue;
          }

          // 0. Determine Basket
          const basket = this.determineBasket(reg.priority_reasons, reg.year);
          const basketName = basket === 1 ? "Chính sách" : basket === 2 ? "Tân sinh viên" : "Khóa cũ";

          // Get basket-specific weights from database
          const weights = await this.getBasketWeights(basket);

          // Get score mappings from database
          const scoreMappings = await this.getScoreMappings();

          // 1. Calculate Priority Score
          const priorityScore = this.calculatePriorityScore(reg.priority_reasons, scoreMappings);

          // 2. Calculate Year Score
          const yearScore = this.calculateYearScore(reg.year, scoreMappings);

          // 3. Calculate GPA Score (with year parameter for special case)
          const gpaScoreResult = this.calculateGPAScore(reg.gpa, reg.year, scoreMappings);

          // 4. Calculate Final AI Score
          let aiScore = null;
          let aiSuggestion = null;
          let aiReasoning = null;

          if (gpaScoreResult.isFiltered) {
            // GPA < 2.0 → Set to lowest priority with valid enum value
            aiScore = 0;
            aiSuggestion = "Không ưu tiên"; // Valid enum value
            aiReasoning = JSON.stringify({
              filtered: true,
              reason: gpaScoreResult.reason + " - Không đạt tiêu chuẩn tối thiểu",
              min_gpa_required: 2.0,
              actual_gpa: reg.gpa,
            });
          } else {
            aiScore = this.calculateFinalAIScore({
              priorityScore: priorityScore,
              yearScore: yearScore,
              gpaScore: gpaScoreResult.score,
              weights: weights,
            });

            aiSuggestion = this.determineAISuggestion(aiScore, basket);

            aiReasoning = JSON.stringify({
              description: "Hệ thống tính điểm theo Nhóm (mỗi nhóm có trọng số riêng)",
              basket: basket,
              basket_name: basketName,
              priority_score: priorityScore,
              year_score: yearScore,
              gpa_score: gpaScoreResult.score,
              basket_weights: weights,
              final_score: aiScore,
              formula: `(${priorityScore} × ${weights.w1_priority}) + (${yearScore} × ${weights.w2_year}) + (${gpaScoreResult.score} × ${weights.w3_gpa}) = ${aiScore}`,
            });
          }

          // 5. Update registration in database
          await RegisterFormDAO.update(reg.id, {
            ai_score: aiScore,
            ai_suggestion: aiSuggestion,
            ai_reasoning: aiReasoning,
          });

          updated.push({ id: reg.id, name: reg.student_name, aiScore });
        } catch (error) {
          console.error(`❌ Lỗi khi tính lại điểm cho ${reg.student_name}:`, error.message);
          skipped.push({ id: reg.id, reason: error.message });
        }
      }

      console.log(`\n✅ HOÀN TẤT: Đã tính lại điểm cho ${updated.length} hồ sơ!`);
      if (skipped.length > 0) {
        console.log(`⚠️  Bỏ qua ${skipped.length} hồ sơ:`, skipped);
      }

      // Log action
      if (adminId && adminId !== "system" && req) {
        await LogSystemDAO.log(
          adminId,
          "RECALCULATE_SCORES",
          "register_forms",
          null,
          null,
          {
            updated: updated.length,
            skipped: skipped.length,
            total: allRegistrations.length,
          },
          req,
        );
      }

      return {
        success: true,
        updated: updated.length,
        skipped: skipped.length,
        total: allRegistrations.length,
        details: { updated, skipped },
      };
    } catch (error) {
      throw new Error(`Recalculate scores failed: ${error.message}`);
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

  /**
   * Get scoring weights settings (full settings object)
   */
  async getScoringWeightsSettings() {
    try {
      let setting = await RegisterFormDAO.getScoringWeightsSettings();

      // If not found, create default settings
      if (!setting) {
        console.log("⚠️ scoring_weights not found, creating default...");

        const defaultSettings = {
          id: "scoring_weights",
          category: "system",
          name: "scoring_weights",
          value: {
            quotas: {
              totalSlots: 1000,
              policy_priority: 0,
              freshmen: 60,
              seniors: 40,
              waterfall_enabled: true,
            },
            weights: {
              basket1: {
                w1_priority: 0.4,
                w2_year: 0.3,
                w3_gpa: 0.3,
              },
              basket2: {
                w1_priority: 0.2,
                w2_year: 0.5,
                w3_gpa: 0.3,
              },
              basket3: {
                w1_priority: 0.1,
                w2_year: 0.2,
                w3_gpa: 0.7,
              },
            },
            scoreMappings: {
              priority: {
                absolute_policy: 100,
                priority_area: 70,
                other_objects: 30,
                non_priority: 0,
              },
              year: {
                year1: 100,
                year2: 60,
                year3: 40,
                year4: 20,
              },
              gpa: {
                conversion_factor: 25,
                min_gpa_filter: 2.0,
              },
            },
          },
          description: "Cấu hình hệ thống chấm điểm và phân bổ chỗ ở cho đăng ký KTX",
          is_active: true,
        };

        setting = await RegisterFormDAO.createScoringWeightsSettings(defaultSettings);
        console.log("✅ Default scoring_weights created successfully");
      }

      // Query dynamic list of faculties and their pending registration count
      const facultyQuery = `
        SELECT 
          faculty, 
          COUNT(*) as count,
          COUNT(CASE WHEN year = 1 THEN 1 END) as freshmen_count,
          COUNT(CASE WHEN year > 1 THEN 1 END) as seniors_count
        FROM register_forms 
        WHERE status = 'Chờ duyệt' AND faculty IS NOT NULL AND faculty != ''
        GROUP BY faculty
        ORDER BY faculty
      `;
      const facultyResults = await RegisterFormDAO.executeQuery(facultyQuery);
      const faculties = facultyResults.map(row => ({
        name: row.faculty,
        count: parseInt(row.count || 0, 10),
        freshmenCount: parseInt(row.freshmen_count || 0, 10),
        seniorsCount: parseInt(row.seniors_count || 0, 10)
      }));

      return {
        ...setting,
        faculties
      };
    } catch (error) {
      throw new Error(`Get scoring weights settings failed: ${error.message}`);
    }
  }

  /**
   * Update scoring weights settings
   */
  async updateScoringWeightsSettings(scoringWeights, req = null) {
    try {
      // Validate scoring weights
      this.validateScoringWeights(scoringWeights);

      const result = await RegisterFormDAO.updateScoringWeightsSettings(scoringWeights, req?.user?.userId);

      // Log action
      if (req && req.user) {
        await LogSystemDAO.log(req.user.userId, "UPDATE_SCORING_WEIGHTS", "settings", "scoring_weights", null, scoringWeights, req);
      }

      return result;
    } catch (error) {
      throw new Error(`Update scoring weights failed: ${error.message}`);
    }
  }

  /**
   * Validate scoring weights structure (supports both flat and 3-basket structure)
   */
  validateScoringWeights(config) {
    // Validate weights - supports both flat structure and 3-basket structure
    if (config.weights) {
      // Check if it's a 3-basket structure (has basket1, basket2, basket3)
      if (config.weights.basket1 || config.weights.basket2 || config.weights.basket3) {
        // Validate each basket
        ["basket1", "basket2", "basket3"].forEach((basketKey) => {
          if (config.weights[basketKey]) {
            const { w1_priority, w2_year, w3_gpa } = config.weights[basketKey];

            if (typeof w1_priority !== "number" || w1_priority < 0 || w1_priority > 1) {
              throw new Error(`Invalid ${basketKey}.w1_priority: must be a number between 0 and 1`);
            }
            if (typeof w2_year !== "number" || w2_year < 0 || w2_year > 1) {
              throw new Error(`Invalid ${basketKey}.w2_year: must be a number between 0 and 1`);
            }
            if (typeof w3_gpa !== "number" || w3_gpa < 0 || w3_gpa > 1) {
              throw new Error(`Invalid ${basketKey}.w3_gpa: must be a number between 0 and 1`);
            }

            const totalWeight = w1_priority + w2_year + w3_gpa;
            if (Math.abs(totalWeight - 1.0) > 0.01) {
              throw new Error(`${basketKey} total weight must equal 1.0 (current: ${totalWeight.toFixed(2)})`);
            }
          }
        });
      } else {
        // Flat structure (legacy support)
        const { w1_priority, w2_year, w3_gpa } = config.weights;

        if (typeof w1_priority !== "number" || w1_priority < 0 || w1_priority > 1) {
          throw new Error("Invalid w1_priority: must be a number between 0 and 1");
        }
        if (typeof w2_year !== "number" || w2_year < 0 || w2_year > 1) {
          throw new Error("Invalid w2_year: must be a number between 0 and 1");
        }
        if (typeof w3_gpa !== "number" || w3_gpa < 0 || w3_gpa > 1) {
          throw new Error("Invalid w3_gpa: must be a number between 0 and 1");
        }

        const totalWeight = w1_priority + w2_year + w3_gpa;
        if (Math.abs(totalWeight - 1.0) > 0.01) {
          throw new Error(`Total weight must equal 1.0 (current: ${totalWeight.toFixed(2)})`);
        }
      }
    }

    // Validate quotas (should sum to 100%)
    if (config.quotas) {
      const { totalSlots, policy_priority, freshmen, seniors } = config.quotas;

      // Validate total slots if provided
      if (totalSlots !== undefined && (typeof totalSlots !== "number" || totalSlots < 0)) {
        throw new Error("Invalid totalSlots: must be a positive number");
      }

      if (policy_priority !== undefined && (typeof policy_priority !== "number" || policy_priority < 0 || policy_priority > 100)) {
        throw new Error("Invalid policy_priority quota");
      }
      if (typeof freshmen !== "number" || freshmen < 0 || freshmen > 100) {
        throw new Error("Invalid freshmen quota");
      }
      if (typeof seniors !== "number" || seniors < 0 || seniors > 100) {
        throw new Error("Invalid seniors quota");
      }

      const totalQuota = (policy_priority !== undefined ? policy_priority : 0) + freshmen + seniors;
      if (Math.abs(totalQuota - 100) > 0.1) {
        throw new Error(`Quotas must sum to 100% (current: ${totalQuota.toFixed(1)}%)`);
      }

      // Validate facultyQuotas if provided
      if (config.quotas.facultyQuotas) {
        if (typeof config.quotas.facultyQuotas !== 'object' || Array.isArray(config.quotas.facultyQuotas)) {
          throw new Error("Invalid facultyQuotas: must be a valid key-value object");
        }
        for (const [key, value] of Object.entries(config.quotas.facultyQuotas)) {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            if (value.freshmen !== undefined && (typeof value.freshmen !== 'number' || value.freshmen < 0)) {
              throw new Error(`Invalid freshmen quota for "${key}": must be a positive number`);
            }
            if (value.seniors !== undefined && (typeof value.seniors !== 'number' || value.seniors < 0)) {
              throw new Error(`Invalid seniors quota for "${key}": must be a positive number`);
            }
          } else if (typeof value !== 'number' || value < 0) {
            throw new Error(`Invalid faculty quota for "${key}": must be a positive number`);
          }
        }
      }
    }

    return true;
  }

  /**
   * CAMPAIGN LAUNCHER SUPPORT METHODS
   */

  /**
   * Get room forecast: Phòng trống hiện tại + sẽ trống sau X ngày
   * @param {number} days - Số ngày dự báo (default: 30)
   * @returns {object} { available_now, available_soon, total, rooms_soon }
   */
  async getRoomForecast(days = 30) {
    try {
      const RoomDAO = require("../dao/RoomDAO");
      
      // Phòng trống ngay lập tức (tổng số slot trống)
      const availableNow = await RoomDAO.countAvailableRooms();
      
      // Chỗ trống theo từng tòa nhà
      const byBuilding = await RoomDAO.countAvailableByBuilding();

      // Hợp đồng sắp hết hạn → số chỗ sẽ được giải phóng
      const expiringContracts = await StudentContractDAO.getExpiringContracts(days);
      const availableSoon = expiringContracts.length; // mỗi HĐ = 1 chỗ giải phóng
      
      // Số phòng unique bị ảnh hưởng (để thông tin thêm)
      const roomIdsSoon = [...new Set(expiringContracts.map(c => c.room_id).filter(Boolean))];

      // Tính tổng số chỗ (capacity) đang hoạt động trong hệ thống
      const totalCapacityRes = await RoomDAO.executeQuery(`
        SELECT COALESCE(SUM(capacity), 0) AS total_capacity
        FROM rooms
        WHERE status = 'Active'
      `);
      const totalCapacity = parseInt(totalCapacityRes[0]?.total_capacity || 0, 10);
      
      return {
        available_now: availableNow,
        available_soon: availableSoon,
        total: availableNow + availableSoon,
        rooms_affected: roomIdsSoon.length,
        by_building: byBuilding,
        forecast_days: days,
        total_capacity: totalCapacity
      };
    } catch (error) {
      throw new Error(`Get room forecast failed: ${error.message}`);
    }
  }

  /**
   * Get demand forecast: Dự báo nhu cầu dựa vào năm trước +10%
   * @returns {object} { last_year, estimated, growth_rate }
   */
  async getDemandForecast() {
    try {
      const currentYear = new Date().getFullYear();
      const lastYear = currentYear - 1;

      // Đếm số hồ sơ thực tế năm trước từ DB
      const actualLastYear = await RegisterFormDAO.countByYear(lastYear);

      // Nếu data fake chưa đủ (< 500), dùng baseline thực tế của trường (~1100 suất/năm)
      const BASELINE = 1100;
      const lastYearCount = actualLastYear >= 500 ? actualLastYear : BASELINE;
      const isBaseline = actualLastYear < 500;

      // Công thức: năm trước × (1 + tăng trưởng 10%)
      const growthRate = 0.10;
      const estimated = Math.ceil(lastYearCount * (1 + growthRate));

      // Phân loại đối tượng dựa trên data thực (hoặc tỷ lệ chuẩn nếu dùng baseline)
      // Tỷ lệ chuẩn TLU: ~10% chính sách, ~50% tân SV năm 1, ~40% lưu SV
      let byTarget;
      if (!isBaseline) {
        byTarget = await RegisterFormDAO.countByTargetGroup(lastYear);
      } else {
        // Baseline: áp tỷ lệ chuẩn lên 1100
        byTarget = [
          { label: "Tân sinh viên (Năm 1)", count: Math.round(lastYearCount * 0.50), color: "blue" },
          { label: "Lưu sinh viên (Năm 2-4)", count: Math.round(lastYearCount * 0.40), color: "violet" },
          { label: "Diện chính sách", count: Math.round(lastYearCount * 0.10), color: "rose" },
        ];
      }

      // Lịch sử 6 năm gần nhất — chỉ đến năm ngoái, không include năm hiện tại
      const HISTORY_YEARS = 6;
      const history = [];
      const PAST_DECLINE = 0.06;

      for (let i = HISTORY_YEARS; i >= 1; i--) {
        const yr = currentYear - i;
        const actualCount = await RegisterFormDAO.countByYear(yr);

        let total, freshmen, returning, policy, isReal;
        if (actualCount >= 500) {
          // Có data thật
          const groups = await RegisterFormDAO.countByTargetGroup(yr);
          total = actualCount;
          freshmen = groups.find(g => g.label.includes("Tân"))?.count || 0;
          returning = groups.find(g => g.label.includes("Lưu"))?.count || 0;
          policy = groups.find(g => g.label.includes("chính sách"))?.count || 0;
          isReal = true;
        } else {
          // Không có data — tạo có logic từ baseline, lùi về quá khứ
          const yearsBack = (currentYear - 1) - yr; // khoảng cách từ lastYear
          total = Math.round(BASELINE * Math.pow(1 - PAST_DECLINE, yearsBack));
          freshmen = Math.round(total * 0.50);
          returning = Math.round(total * 0.40);
          policy = total - freshmen - returning;
          isReal = false;
        }

        history.push({ year: yr, total, freshmen, returning, policy, isReal });
      }

      return {
        last_year: lastYearCount,
        estimated,
        growth_rate: growthRate,
        year: currentYear,
        is_baseline: isBaseline,
        by_target: byTarget,
        history,
      };
    } catch (error) {
      throw new Error(`Get demand forecast failed: ${error.message}`);
    }
  }

  /**
   * Duyệt hàng loạt hồ sơ chờ duyệt → tạo hợp đồng Pending (chưa gán phòng).
   * Sắp xếp theo nhóm ưu tiên + điểm AI, tuân thủ chỉ tiêu từng giỏ.
   */
  async bulkApproveRegistrations({ faculty, adminId, simulate = false, allowOverflow = false, tempQuotas = null, req = null }) {
    try {
      let query = "SELECT * FROM register_forms WHERE status = 'Chờ duyệt'";
      const params = [];
      if (faculty && faculty !== "All") {
        query += " AND faculty = $1";
        params.push(faculty);
      }
      const registrations = await RegisterFormDAO.executeQuery(query, params);

      const setting = await RegisterFormDAO.getScoringWeightsSettings();
      let totalSlots = 1000;
      let quotas = { freshmen: 60, seniors: 40 };
      let facultyQuotas = {};

      if (setting?.value?.quotas) {
        if (setting.value.quotas.totalSlots) totalSlots = setting.value.quotas.totalSlots;
        if (setting.value.quotas.freshmen !== undefined) quotas.freshmen = setting.value.quotas.freshmen;
        if (setting.value.quotas.seniors !== undefined) quotas.seniors = setting.value.quotas.seniors;
        if (setting.value.quotas.facultyQuotas) {
          facultyQuotas = { ...setting.value.quotas.facultyQuotas };
        }
      }

      // Override with tempQuotas if provided
      if (tempQuotas) {
        if (tempQuotas.totalSlots !== undefined) totalSlots = parseInt(tempQuotas.totalSlots, 10) || 1000;
        if (tempQuotas.freshmen !== undefined) quotas.freshmen = parseFloat(tempQuotas.freshmen) || 60;
        if (tempQuotas.seniors !== undefined) quotas.seniors = parseFloat(tempQuotas.seniors) || 40;
        if (tempQuotas.facultyQuotas) {
          facultyQuotas = { ...tempQuotas.facultyQuotas };
        }
      }

      // If committing (not simulate) and tempQuotas is provided, save it permanently to settings DB
      if (!simulate && tempQuotas && setting) {
        try {
          const updatedQuotas = {
            totalSlots,
            policy_priority: 0,
            freshmen: quotas.freshmen,
            seniors: quotas.seniors,
            waterfall_enabled: true,
            facultyQuotas
          };
          const newConfig = {
            quotas: updatedQuotas,
            weights: setting.value.weights,
            scoreMappings: setting.value.scoreMappings
          };
          this.validateScoringWeights(newConfig);
          await RegisterFormDAO.updateScoringWeightsSettings(newConfig, adminId);
        } catch (saveErr) {
          console.error("⚠️ Failed to save tempQuotas to settings DB:", saveErr.message);
        }
      }

      const slotsPerBasket = {
        freshmen: Math.round((quotas.freshmen / 100) * totalSlots),
        seniors: Math.round((quotas.seniors / 100) * totalSlots),
      };

      const remainingSlots = {
        freshmen: slotsPerBasket.freshmen,
        seniors: slotsPerBasket.seniors,
      };

      const remainingFacultySlots = {};
      const facultyQuotaEnabled = Object.keys(facultyQuotas).length > 0;
      if (facultyQuotaEnabled) {
        for (const [fac, cap] of Object.entries(facultyQuotas)) {
          if (cap && typeof cap === 'object' && !Array.isArray(cap)) {
            remainingFacultySlots[fac] = {
              freshmen: parseInt(cap.freshmen, 10) || 0,
              seniors: parseInt(cap.seniors, 10) || 0
            };
          } else {
            remainingFacultySlots[fac] = parseInt(cap, 10) || 0;
          }
        }
      }

      // Vẫn sắp xếp theo thứ tự Basket (1 -> 2 -> 3) để đưa các bạn Chính sách lên đầu duyệt trước
      registrations.sort((a, b) => {
        const aBasket = this.determineBasket(a.priority_reasons, a.year);
        const bBasket = this.determineBasket(b.priority_reasons, b.year);
        if (aBasket !== bBasket) return aBasket - bBasket;
        return (b.ai_score || 0) - (a.ai_score || 0);
      });

      let totalRemainingSlots = totalSlots;
      const approved = [];
      const skipped = [];
      const overflowCandidates = [];
      let processed = 0;
      let skippedQuota = 0;

      for (const reg of registrations) {
        const quotaKey = reg.year === 1 ? "freshmen" : "seniors";
        const studentFaculty = reg.faculty || "Không xác định";
        
        if (totalRemainingSlots <= 0) {
          skipped.push({
            id: reg.id,
            student_name: reg.student_name,
            student_id: reg.student_id,
            faculty: studentFaculty,
            reason: "Hết chỉ tiêu toàn KTX",
            year: reg.year,
            basket: this.determineBasket(reg.priority_reasons, reg.year)
          });
          skippedQuota++;
          continue;
        }

        const isGroupQuotaExceeded = remainingSlots[quotaKey] <= 0;
        let isFacultyQuotaExceeded = false;
        const facLimit = facultyQuotas[studentFaculty];
        if (facultyQuotaEnabled && facLimit !== undefined) {
          if (facLimit && typeof facLimit === 'object' && !Array.isArray(facLimit)) {
            const limitForGroup = facLimit[quotaKey];
            if (limitForGroup > 0 && remainingFacultySlots[studentFaculty][quotaKey] <= 0) {
              isFacultyQuotaExceeded = true;
            }
          } else {
            if (facLimit > 0 && remainingFacultySlots[studentFaculty] <= 0) {
              isFacultyQuotaExceeded = true;
            }
          }
        }

        if (isGroupQuotaExceeded || isFacultyQuotaExceeded) {
          if (allowOverflow) {
            overflowCandidates.push(reg);
          } else {
            const reason = isGroupQuotaExceeded 
              ? `Hết chỉ tiêu nhóm đối tượng (${quotaKey === "freshmen" ? "Tân sinh viên" : "Sinh viên khóa cũ"})`
              : `Vượt quá chỉ tiêu khoa ${studentFaculty} (${typeof facLimit === 'object' ? facLimit[quotaKey] : facLimit} chỗ)`;
            skipped.push({
              id: reg.id,
              student_name: reg.student_name,
              student_id: reg.student_id,
              faculty: studentFaculty,
              reason: reason,
              year: reg.year,
              basket: this.determineBasket(reg.priority_reasons, reg.year)
            });
            skippedQuota++;
          }
          continue;
        }

        if (!simulate) {
          await this.approveRegistration(reg.id, adminId, null, req);
        }
        processed++;
        remainingSlots[quotaKey]--;
        totalRemainingSlots--;
        if (facultyQuotaEnabled && remainingFacultySlots[studentFaculty] !== undefined) {
          if (typeof remainingFacultySlots[studentFaculty] === 'object') {
            remainingFacultySlots[studentFaculty][quotaKey]--;
          } else {
            remainingFacultySlots[studentFaculty]--;
          }
        }

        approved.push({
          id: reg.id,
          student_name: reg.student_name,
          student_id: reg.student_id,
          faculty: studentFaculty,
          status: simulate ? "Simulated-Approved" : "Pending",
          source: "Phase 1: Đúng chỉ tiêu nhóm & khoa",
          year: reg.year,
          basket: this.determineBasket(reg.priority_reasons, reg.year)
        });
      }

      const overflowAllocations = [];
      if (allowOverflow) {
        for (const reg of overflowCandidates) {
          const quotaKey = reg.year === 1 ? "freshmen" : "seniors";
          const studentFaculty = reg.faculty || "Không xác định";

          if (totalRemainingSlots <= 0) {
            skipped.push({
              id: reg.id,
              student_name: reg.student_name,
              student_id: reg.student_id,
              faculty: studentFaculty,
              reason: "Hết chỗ trống KTX (khi dồn chỉ tiêu)",
              year: reg.year,
              basket: this.determineBasket(reg.priority_reasons, reg.year)
            });
            skippedQuota++;
            continue;
          }

          if (!simulate) {
            await this.approveRegistration(reg.id, adminId, "Duyệt dồn chỉ tiêu", req);
          }

          processed++;
          remainingSlots[quotaKey]--;
          totalRemainingSlots--;
          if (facultyQuotaEnabled && remainingFacultySlots[studentFaculty] !== undefined) {
            if (typeof remainingFacultySlots[studentFaculty] === 'object') {
              remainingFacultySlots[studentFaculty][quotaKey]--;
            } else {
              remainingFacultySlots[studentFaculty]--;
            }
          }

          const approvedItem = {
            id: reg.id,
            student_name: reg.student_name,
            student_id: reg.student_id,
            faculty: studentFaculty,
            status: simulate ? "Simulated-Approved" : "Pending",
            source: "Phase 2: Dồn chỉ tiêu",
            year: reg.year,
            basket: this.determineBasket(reg.priority_reasons, reg.year)
          };
          approved.push(approvedItem);
          overflowAllocations.push(approvedItem);
        }
      } else {
        for (const reg of overflowCandidates) {
          const studentFaculty = reg.faculty || "Không xác định";
          const quotaKey = reg.year === 1 ? "freshmen" : "seniors";
          skipped.push({
            id: reg.id,
            student_name: reg.student_name,
            student_id: reg.student_id,
            faculty: studentFaculty,
            reason: `Vượt quá chỉ tiêu khoa ${studentFaculty} (${typeof facultyQuotas[studentFaculty] === 'object' ? facultyQuotas[studentFaculty][quotaKey] : facultyQuotas[studentFaculty]} chỗ)`,
            year: reg.year,
            basket: this.determineBasket(reg.priority_reasons, reg.year)
          });
          skippedQuota++;
        }
      }

      const overflowDetails = {};
      if (facultyQuotaEnabled) {
        for (const fac of Object.keys(facultyQuotas)) {
          const limit = facultyQuotas[fac];
          if (limit && typeof limit === 'object' && !Array.isArray(limit)) {
            // Tân SV
            const appliedFreshmen = registrations.filter(r => r.faculty === fac && r.year === 1).length;
            const approvedFreshmen = approved.filter(r => r.faculty === fac && r.year === 1).length;
            const limF = limit.freshmen || 0;
            overflowDetails[`${fac} (Tân SV)`] = {
              quota: limF,
              applied: appliedFreshmen,
              approved: approvedFreshmen,
              leftover: limF > 0 ? Math.max(0, limF - approvedFreshmen) : 0,
              excess: limF > 0 ? Math.max(0, appliedFreshmen - limF) : 0
            };

            // Khóa cũ
            const appliedSeniors = registrations.filter(r => r.faculty === fac && r.year > 1).length;
            const approvedSeniors = approved.filter(r => r.faculty === fac && r.year > 1).length;
            const limS = limit.seniors || 0;
            overflowDetails[`${fac} (Khóa cũ)`] = {
              quota: limS,
              applied: appliedSeniors,
              approved: approvedSeniors,
              leftover: limS > 0 ? Math.max(0, limS - approvedSeniors) : 0,
              excess: limS > 0 ? Math.max(0, appliedSeniors - limS) : 0
            };
          } else {
            const applied = registrations.filter(r => r.faculty === fac).length;
            const approvedCount = approved.filter(r => r.faculty === fac).length;
            const lim = limit || 0;
            overflowDetails[fac] = {
              quota: lim,
              applied: applied,
              approved: approvedCount,
              leftover: lim > 0 ? Math.max(0, lim - approvedCount) : 0,
              excess: lim > 0 ? Math.max(0, applied - lim) : 0
            };
          }
        }
      }

      const isSimulation = !!simulate;

      if (!isSimulation && adminId && adminId !== "system" && req) {
        await LogSystemDAO.log(
          adminId,
          "AUTO_APPROVE_REGISTRATIONS",
          "register_forms",
          null,
          null,
          { processed, approvedCount: approved.length, skippedQuota, allowOverflow },
          req
        );
      }

      return { 
        processed, 
        approved, 
        skipped,
        skippedQuota, 
        allocations: approved,
        isSimulation,
        allowOverflow,
        overflowDetails,
        overflowAllocations
      };
    } catch (error) {
      throw new Error(`Bulk approve registrations failed: ${error.message}`);
    }
  }

  /** @deprecated Dùng bulkApproveRegistrations — giữ alias để tương thích route cũ */
  async autoAllocateRooms(opts) {
    return this.bulkApproveRegistrations(opts);
  }
}

module.exports = new RegistrationService();
