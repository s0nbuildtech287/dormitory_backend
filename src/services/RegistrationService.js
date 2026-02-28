const RegisterFormDAO = require("../dao/RegisterFormDAO");
const LogSystemDAO = require("../dao/LogSystemDAO");
const SettingsDAO = require("../dao/SettingsDAO");
const StudentContractDAO = require("../dao/StudentContractDAO");
const UserDAO = require("../dao/UserDAO");
const bcrypt = require("bcryptjs");
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
   * Fetch score mappings from settings
   */
  async getScoreMappings() {
    try {
      const setting = await SettingsDAO.getSettingByName("system", "scoring_weights");

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
   * Calculate Priority Score based on priority_reasons
   * @param {string} priorityReasons - Priority reason string
   * @param {object} scoreMappings - Score mappings from settings
   * @returns {number} Priority score (0-100)
   */
  calculatePriorityScore(priorityReasons, scoreMappings = null) {
    // Use defaults if no mappings provided
    const mappings = scoreMappings?.priority || {
      absolute_policy: 100,
      priority_area: 70,
      other_objects: 30,
      non_priority: 0,
    };

    if (!priorityReasons) {
      return mappings.non_priority; // Không thuộc diện ưu tiên
    }

    const lowerReason = priorityReasons.toLowerCase();

    // Chính sách tuyệt đối
    if (
      lowerReason.includes("hộ nghèo") ||
      lowerReason.includes("cận nghèo") ||
      lowerReason.includes("thương binh") ||
      lowerReason.includes("liệt sỹ") ||
      lowerReason.includes("khuyết tật") ||
      lowerReason.includes("lưu học sinh") ||
      lowerReason.includes("hoàn cảnh khó khăn đặc biệt")
    ) {
      return mappings.absolute_policy;
    }

    // Khu vực ưu tiên
    if (lowerReason.includes("vùng sâu") || lowerReason.includes("vùng xa") || lowerReason.includes("hải đảo") || lowerReason.includes("vùng có điều kiện kinh tế đặc biệt khó khăn")) {
      return mappings.priority_area;
    }

    // Đối tượng khác
    if (lowerReason.includes("giấy xác nhận ưu tiên") || lowerReason.includes("ưu tiên khác")) {
      return mappings.other_objects;
    }

    // Mặc định: không thuộc diện ưu tiên
    return mappings.non_priority;
  }

  /**
   * Calculate Year Score based on student year
   * @param {number} year - Student year (1-4)
   * @param {object} scoreMappings - Score mappings from settings
   * @returns {number} Year score (0-100)
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
   * Calculate GPA Score
   * Formula: GPA × conversion_factor (default 25 for 4.0 system)
   * Special case: Year 1 students with GPA = 0 get score = 50 (haven't taken courses yet)
   * @param {number} gpa - Student GPA
   * @param {number} year - Student year (1-4)
   * @param {object} scoreMappings - Score mappings from settings
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
   * Determine basket for registration (3-basket system)
   * @param {string} priorityReasons - Priority reasons
   * @param {number} year - Student year
   * @returns {number} Basket number (1, 2, or 3)
   */
  determineBasket(priorityReasons, year) {
    // Rổ 1: Chính sách (có priority_reasons)
    if (priorityReasons && priorityReasons.trim() !== "") {
      return 1;
    }

    // Rổ 2: Tân sinh viên (năm 1, không có chính sách)
    if (year === 1) {
      return 2;
    }

    // Rổ 3: Khóa cũ (năm 2, 3, 4, không có chính sách)
    return 3;
  }

  /**
   * Get basket-specific scoring weights
   * Each basket has different priorities:
   * - Rổ 1 (Chính sách): Priority > Year > GPA
   * - Rổ 2 (Tân SV): Year > Priority, GPA ít quan trọng
   * - Rổ 3 (Khóa cũ): GPA > Year > Priority
   * @param {number} basket - Basket number (1, 2, or 3)
   * @returns {object} Weights { w1_priority, w2_year, w3_gpa }
   */
  async getBasketWeights(basket) {
    try {
      const setting = await SettingsDAO.getSettingByName("system", "scoring_weights");

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
   * Calculate final AI Score (0-100 scale)
   * Formula uses basket-specific weights
   * @param {object} params - { priorityScore, yearScore, gpaScore, basket, weights }
   * @returns {number} Final AI score (0-100)
   */
  calculateFinalAIScore(params) {
    const { priorityScore, yearScore, gpaScore, weights } = params;

    // Calculate score with basket-specific formula
    const score = priorityScore * weights.w1_priority + yearScore * weights.w2_year + gpaScore * weights.w3_gpa;

    return Math.round(score);
  }

  /**
   * Determine AI Suggestion based on score and basket
   * Different baskets have different thresholds
   * @param {number} score - AI score (0-100)
   * @param {number} basket - Basket number (1, 2, or 3)
   * @returns {string} AI suggestion
   */
  determineAISuggestion(score, basket) {
    // Rổ 1 (Chính sách): Nới lỏng tiêu chuẩn vì ưu tiên hoàn cảnh
    // Rổ 2 (Tân SV): Nới lỏng vì chưa có điểm GPA
    // Rổ 3 (Khóa cũ): Chặt chẽ hơn vì có GPA
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
   * Get all registrations with filters
   * Results are sorted by: Basket (1 → 2 → 3) then AI Score within each basket
   * Also marks registrations as "full" if they exceed available slots
   */
  async getRegistrations(filters = {}) {
    try {
      const registrations = await RegisterFormDAO.searchAndFilter(filters);

      // Sort by Basket first, then by AI Score (which already includes basket bonus)
      // This ensures: Rổ 1 (Chính sách) > Rổ 2 (Tân SV) > Rổ 3 (Khóa cũ)
      registrations.sort((a, b) => {
        // Extract basket from ai_reasoning JSON
        let aBasket = 3; // Default to Rổ 3 if can't determine
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
          return aBasket - bBasket; // Rổ 1 < Rổ 2 < Rổ 3
        }

        // 2. Within same basket: Sort by AI Score (higher is better)
        return (b.ai_score || 0) - (a.ai_score || 0);
      });

      // Check for full slots per basket and mark registrations accordingly
      try {
        const setting = await SettingsDAO.getSettingByName("system", "scoring_weights");
        let totalSlots = 1000; // Default
        let quotas = {
          policy_priority: 10,
          freshmen: 60,
          seniors: 30,
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

        // Calculate slots per basket
        const slotsPerBasket = {
          1: Math.round((quotas.policy_priority / 100) * totalSlots), // Rổ 1: Chính sách
          2: Math.round((quotas.freshmen / 100) * totalSlots), // Rổ 2: Tân SV
          3: Math.round((quotas.seniors / 100) * totalSlots), // Rổ 3: Khóa cũ
        };

        console.log(`📊 Slot allocation: Rổ 1=${slotsPerBasket[1]}, Rổ 2=${slotsPerBasket[2]}, Rổ 3=${slotsPerBasket[3]} (Total: ${totalSlots})`);

        // Count pending registrations per basket
        const basketCounts = { 1: 0, 2: 0, 3: 0 };

        registrations.forEach((reg) => {
          // Only count pending registrations
          if (reg.status === "Chờ duyệt") {
            // Determine which basket this registration belongs to
            let basket = 3; // Default
            try {
              if (reg.ai_reasoning) {
                const reasoning = JSON.parse(reg.ai_reasoning);
                basket = reasoning.basket || this.determineBasket(reg.priority_reasons, reg.year);
              } else {
                basket = this.determineBasket(reg.priority_reasons, reg.year);
              }
            } catch (e) {
              basket = this.determineBasket(reg.priority_reasons, reg.year);
            }

            // Increment count for this basket
            basketCounts[basket]++;

            // Mark as full if this basket has exceeded its quota
            reg.isFull = basketCounts[basket] > slotsPerBasket[basket];
          } else {
            reg.isFull = false;
          }
        });

        console.log(`📊 Registration counts: Rổ 1=${basketCounts[1]}, Rổ 2=${basketCounts[2]}, Rổ 3=${basketCounts[3]}`);
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
   * Create new registration with complete validation and AI scoring
   *
   * Flow:
   * 1. Validate input data
   * 2. Check for duplicate student_id
   * 3. Calculate AI scores
   * 4. Determine basket and AI suggestion
   * 5. Create AI reasoning object
   * 6. Save to database
   * 7. Log action
   *
   * @param {object} data - Registration data from admin form
   * @param {object} req - Express request object
   * @returns {object} Created registration with AI scores and suggestion
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

      return registration;
    } catch (error) {
      console.error(`❌ Create registration failed: ${error.message}`);
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
          // Tạo tài khoản sinh viên với mật khẩu mặc định là mã SV hoặc '123456'
          const defaultPwd = oldData.student_id || "123456";
          const hashed = await bcrypt.hash(defaultPwd, 10);
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

          await StudentContractDAO.createPendingContract({
            id: contractId,
            contract_number: contractNumber,
            user_id: userId,
            room_id: null,
            register_form_id: id,
            status: "Pending",
            // Snapshot
            snapshot_student_id: oldData.student_id || null,
            snapshot_cccd: oldData.cccd || null,
            snapshot_gender: oldData.gender || null,
            snapshot_year: oldData.year || null,
            snapshot_faculty: oldData.faculty || null,
            snapshot_phone: oldData.phone_number || null,
            // Giá thuê mặc định 0, sẽ cập nhật khi gán phòng
            rent_price: 0,
            deposit_amount: 0,
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
   * Delete registration
   * @param {string} id - Registration ID
   * @param {string} adminId - Admin ID performing the action
   * @param {object} req - Request object for logging
   * @returns {object} Deleted registration data
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

          // Chỉ tính nếu có đủ thông tin chính
          if (gpa !== null && year !== undefined) {
            // 0. Xác định Rổ (Basket)
            const basket = this.determineBasket(row["Lý do ưu tiên"] || row["priority_reasons"], year);
            const basketName = basket === 1 ? "Chính sách" : basket === 2 ? "Tân sinh viên" : "Khóa cũ";
            console.log(`    ➜ Basket: Rổ ${basket} (${basketName})`);

            // Get basket-specific weights from database
            const weights = await this.getBasketWeights(basket);
            console.log(`    ⚖️  Weights (Rổ ${basket}): Priority=${weights.w1_priority}, Year=${weights.w2_year}, GPA=${weights.w3_gpa}`);

            // Get score mappings from database
            const scoreMappings = await this.getScoreMappings();

            // 1. Tính Priority Score (Điểm Ưu tiên)
            const priorityScore = this.calculatePriorityScore(row["Lý do ưu tiên"] || row["priority_reasons"], scoreMappings);
            console.log(`    ➜ PriorityScore: ${priorityScore}`);

            // 2. Tính Year Score (Điểm Năm học)
            const yearScore = this.calculateYearScore(year, scoreMappings);
            console.log(`    ➜ YearScore (Năm ${year}): ${yearScore}`);

            // 3. Tính GPA Score (Điểm GPA) - Truyền year để xử lý đặc biệt cho năm 1
            const gpaScoreResult = this.calculateGPAScore(gpa, year, scoreMappings);
            if (gpaScoreResult.isFiltered) {
              console.log(`    ➜ GPAScore: ${gpaScoreResult.score} ⛔ FILTERED (${gpaScoreResult.reason})`);
              isGPAFiltered = true;
            } else {
              const scoreExplanation = gpaScoreResult.reason || `${gpa} × 25`;
              console.log(`    ➜ GPAScore (${scoreExplanation}): ${gpaScoreResult.score}`);
            }

            // 4. Tính Final AI Score (0-100)
            if (!isGPAFiltered) {
              aiScore = this.calculateFinalAIScore({
                priorityScore: priorityScore,
                yearScore: yearScore,
                gpaScore: gpaScoreResult.score,
                weights: weights,
              });

              aiSuggestion = this.determineAISuggestion(aiScore, basket);

              aiReasoning = JSON.stringify({
                description: "Hệ thống tính điểm theo Rổ (mỗi rổ có trọng số riêng)",
                basket: basket,
                basket_name: basketName,
                priority_score: priorityScore,
                year_score: yearScore,
                gpa_score: gpaScoreResult.score,
                basket_weights: weights,
                final_score: aiScore,
                formula: `(${priorityScore} × ${weights.w1_priority}) + (${yearScore} × ${weights.w2_year}) + (${gpaScoreResult.score} × ${weights.w3_gpa}) = ${aiScore}`,
              });

              console.log(`  ✨ AI Score: ${aiScore} -> ${aiSuggestion} (Rổ ${basket})`);
            } else {
              // GPA < 2.0 → Set to lowest priority with valid enum value
              aiScore = 0;
              aiSuggestion = "Không ưu tiên"; // Valid enum value
              aiReasoning = JSON.stringify({
                filtered: true,
                reason: "GPA < 2.0 - Không đạt tiêu chuẩn tối thiểu",
                min_gpa_required: 2.0,
                actual_gpa: gpa,
              });
              console.log(`  ❌ GPA không đạt tiêu chuẩn tối thiểu (2.0) - Đánh giá: Không ưu tiên`);
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
              description: "Hệ thống tính điểm theo Rổ (mỗi rổ có trọng số riêng)",
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
}

module.exports = new RegistrationService();
