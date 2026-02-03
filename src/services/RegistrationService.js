const RegisterFormDAO = require('../dao/RegisterFormDAO');
const LogSystemDAO = require('../dao/LogSystemDAO');
const xlsx = require('xlsx');

class RegistrationService {
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

    /**
     * Get registration by ID
     */
    async getRegistrationById(id) {
        try {
            const registration = await RegisterFormDAO.findById(id);
            if (!registration) {
                throw new Error('Registration not found');
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
                status: 'Chờ duyệt'
            });

            // Log action
            if (req && req.user) {
                await LogSystemDAO.log(
                    req.user.userId,
                    'CREATE_REGISTRATION',
                    'register_forms',
                    registrationId,
                    null,
                    registration,
                    req
                );
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
                throw new Error('Registration not found');
            }

            await RegisterFormDAO.updateStatus(id, 'Chấp nhận', adminId, note);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'APPROVE_REGISTRATION',
                'register_forms',
                id,
                { status: oldData.status },
                { status: 'Chấp nhận', note },
                req
            );

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
                throw new Error('Registration not found');
            }

            await RegisterFormDAO.updateStatus(id, 'Từ chối', adminId, note);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'REJECT_REGISTRATION',
                'register_forms',
                id,
                { status: oldData.status },
                { status: 'Từ chối', note },
                req
            );

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
            console.log('📂 BƯỚC 1: Đọc file Excel/CSV...');

            // Đọc file với UTF-8 encoding
            // Codepage 65001 = UTF-8
            const workbook = xlsx.readFile(filePath, {
                codepage: 65001,  // Force UTF-8
                type: 'binary'
            });

            const sheetName = workbook.SheetNames[0]; // Lấy sheet đầu tiên
            const sheet = workbook.Sheets[sheetName];

            // Chuyển sheet thành JSON array
            // Header row sẽ trở thành key của object
            const rawData = xlsx.utils.sheet_to_json(sheet, {
                raw: false,  // Convert tất cả thành string
                defval: ''   // Default value cho empty cells
            });

            console.log(`✅ Đã đọc ${rawData.length} dòng dữ liệu từ file`);
            console.log('📋 Preview dòng đầu tiên:', rawData[0]);

            const registrations = [];
            const errors = [];
            const warnings = [];

            console.log('\n🔄 BƯỚC 2: Xử lý từng dòng dữ liệu...\n');

            // Xử lý từng dòng trong Excel
            for (let i = 0; i < rawData.length; i++) {
                const rowNumber = i + 2; // +2 vì Excel bắt đầu từ 1 và có header row
                const row = rawData[i];

                try {
                    console.log(`\n--- Xử lý dòng ${rowNumber} ---`);

                    // ========== BƯỚC 2.1: VALIDATE DỮ LIỆU BỮT BUỘC ==========
                    const validationErrors = [];

                    // Các trường bắt buộc - hỗ trợ cả tiếng Việt và snake_case từ CSV
                    if (!row['Họ tên'] && !row['student_name']) {
                        validationErrors.push('Thiếu họ tên');
                    }
                    // CSV có cột 'email' nhưng trong DB là 'student_email', nên check cả hai
                    if (!row['Email'] && !row['email'] && !row['student_email']) {
                        validationErrors.push('Thiếu email');
                    }
                    if (!row['Số điện thoại'] && !row['phone'] && !row['phone_number']) {
                        validationErrors.push('Thiếu số điện thoại');
                    }
                    if (!row['Giới tính'] && !row['gender']) {
                        validationErrors.push('Thiếu giới tính');
                    }

                    if (validationErrors.length > 0) {
                        throw new Error(`Dữ liệu không hợp lệ: ${validationErrors.join(', ')}`);
                    }

                    // ========== BƯỚC 2.2: CHUẨN HÓA DỮ LIỆU ==========
                    console.log('  📝 Chuẩn hóa dữ liệu...');

                    // Lấy và chuẩn hóa email (lowercase, trim)
                    // CSV có 2 cột: 'email' (email người đăng ký) và 'student_email' (email sinh viên)
                    // Ta lưu student_email vào DB
                    const studentEmail = (row['student_email'] || row['Email'] || row['email']).toString().trim().toLowerCase();

                    // Chuẩn hóa giới tính (ENCODING-AGNOSTIC - chỉ check chữ cái đầu)
                    let genderRaw = (row['Giới tính'] || row['gender']).toString().trim();
                    const firstChar = genderRaw.charAt(0).toUpperCase();
                    let gender; // Khai báo biến

                    // Logic: N + "am" = Nam, còn N khác = Nữ (vì "Nữ" có thể bị encode sai)
                    if (genderRaw.toLowerCase().includes('nam') || firstChar === 'M') {
                        gender = 'Nam';
                    } else {
                        // Mặc định là Nữ cho tất cả trường hợp còn lại (F, N, Nữ bị encode)
                        gender = 'Nữ';
                    }

                    // Chuẩn hóa số điện thoại (loại bỏ khoảng trắng, dấu gạch ngang)
                    const phone = (row['Số điện thoại'] || row['phone'] || row['phone_number']).toString().replace(/[\s-]/g, '');

                    // Chuẩn hóa ngày sinh (nếu có)
                    let dob = null;
                    if (row['Ngày sinh'] || row['dob']) {
                        try {
                            const dobStr = row['Ngày sinh'] || row['dob'];
                            // Excel có thể trả về date object hoặc string
                            if (dobStr instanceof Date) {
                                dob = dobStr.toISOString().split('T')[0];
                            } else {
                                // Parse string date (nhiều format: DD/MM/YYYY, YYYY-MM-DD...)
                                const parts = dobStr.toString().split(/[-/]/);
                                if (parts.length === 3) {
                                    // Assume DD/MM/YYYY if first part <= 31
                                    if (parseInt(parts[0]) <= 31) {
                                        dob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                                    } else {
                                        // Assume YYYY-MM-DD
                                        dob = dobStr;
                                    }
                                }
                            }
                        } catch (e) {
                            warnings.push({ row: rowNumber, message: 'Không parse được ngày sinh, bỏ qua trường này' });
                        }
                    }

                    // Parse số (GPA, khoảng cách, điểm ưu tiên)
                    const gpa = row['GPA'] || row['gpa'] ? parseFloat(row['GPA'] || row['gpa']) : null;
                    const distance = row['Khoảng cách'] || row['distance'] ? parseInt(row['Khoảng cách'] || row['distance']) : null;
                    const priorityPoints = row['Điểm ưu tiên'] || row['priority_points'] ? parseInt(row['Điểm ưu tiên'] || row['priority_points']) : 0;

                    // ========== BƯỚC 2.3: CHECK TRÙNG LẶP ==========
                    console.log('  🔍 Kiểm tra trùng lặp...');
                    const existingByEmail = await RegisterFormDAO.findOne({ student_email: studentEmail });
                    if (existingByEmail) {
                        throw new Error(`Email đã tồn tại trong hệ thống: ${studentEmail}`);
                    }

                    const studentId = row['Mã SV'] || row['student_id'];
                    if (studentId) {
                        const existingByStudentId = await RegisterFormDAO.findByStudentId(studentId);
                        if (existingByStudentId.length > 0) {
                            throw new Error(`Mã sinh viên đã tồn tại: ${studentId}`);
                        }
                    }

                    // ========== BƯỚC 2.4: TÍNH ĐIỂM AI SUGGESTION ==========
                    console.log('  🤖 Tính điểm AI suggestion...');
                    let aiSuggestion = null;
                    let aiScore = null;
                    let aiReasoning = null;

                    // Chỉ tính nếu có đủ thông tin
                    if (gpa !== null && distance !== null) {
                        // Tính điểm dựa trên GPA (0-100)
                        const gpaScore = Math.min((gpa / 4.0) * 100, 100);

                        // Tính điểm dựa trên khoảng cách (càng xa càng cao điểm)
                        const distanceScore = Math.min((distance / 500) * 100, 100);

                        // Điểm năm học (năm 1 ưu tiên cao hơn)
                        let yearValue = row['Năm học'] || row['year'] || 1;
                        // Parse "năm 4" → 4
                        if (typeof yearValue === 'string') {
                            const match = yearValue.match(/\d+/);
                            yearValue = match ? parseInt(match[0]) : 1;
                        }
                        const yearScore = yearValue === 1 ? 100 : yearValue === 2 ? 80 : yearValue === 3 ? 60 : 40;

                        // Điểm ưu tiên (chính sách, hoàn cảnh khó khăn...)
                        const circumstanceScore = priorityPoints;

                        // Tính điểm tổng (weighted average)
                        aiScore = Math.round(
                            (gpaScore * 0.3) +
                            (distanceScore * 0.3) +
                            (yearScore * 0.2) +
                            (circumstanceScore * 0.2)
                        );

                        // Phân loại
                        if (aiScore >= 80) {
                            aiSuggestion = 'Nên duyệt';
                        } else if (aiScore >= 60) {
                            aiSuggestion = 'Cân nhắc';
                        } else {
                            aiSuggestion = 'Không ưu tiên';
                        }

                        aiReasoning = JSON.stringify({
                            priority: Math.round(gpaScore),
                            distance: Math.round(distanceScore),
                            year: yearScore,
                            circumstance: circumstanceScore
                        });

                        console.log(`  ✨ AI Score: ${aiScore} -> ${aiSuggestion}`);
                    }

                    // ========== BƯỚC 2.5: TẠO OBJECT HỒ SƠ ==========
                    const registrationId = `reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                    // Parse year value from string "năm 4" → 4
                    let finalYear = row['Năm học'] || row['year'] || 1;
                    if (typeof finalYear === 'string') {
                        const match = finalYear.match(/\d+/);
                        finalYear = match ? parseInt(match[0]) : 1;
                    }

                    // Parse evidence_images nếu có (CSV có thể là string URL)
                    let evidenceImages = null;
                    if (row['evidence_images']) {
                        try {
                            evidenceImages = JSON.stringify([row['evidence_images']]);
                        } catch (e) {
                            evidenceImages = null;
                        }
                    }

                    const registration = {
                        id: registrationId,
                        student_name: (row['Họ tên'] || row['student_name']).toString().trim(),
                        student_id: studentId || null,
                        student_email: studentEmail,
                        phone_number: phone,
                        gender: gender,
                        dob: dob,
                        cccd: (row['cccd'] || row['CCCD'] || '').toString().trim() || null,
                        address: (row['Địa chỉ'] || row['address'] || '').toString().trim(),
                        faculty: (row['Khoa'] || row['faculty'] || '').toString().trim(),
                        major: (row['Chuyên ngành'] || row['major'] || '').toString().trim(),
                        class: (row['Lớp'] || row['class'] || '').toString().trim(),
                        year: finalYear,
                        gpa: gpa,
                        distance: distance,
                        priority_reasons: (row['priority_reasons'] || row['Lý do ưu tiên'] || '').toString().trim(),
                        priority_points: priorityPoints,
                        evidence_images: evidenceImages,
                        note: (row['note'] || row['Ghi chú'] || '').toString().trim(),
                        ai_suggestion: aiSuggestion,
                        ai_score: aiScore,
                        ai_reasoning: aiReasoning,
                        status: 'Chờ duyệt'
                    };

                    // ========== BƯỚC 2.6: LƯU VÀO DATABASE ==========
                    console.log('  💾 Lưu vào database...');
                    await RegisterFormDAO.create(registration);
                    registrations.push(registration);
                    console.log(`  ✅ Thành công: ${registration.student_name}`);

                } catch (error) {
                    console.log(`  ❌ Lỗi: ${error.message}`);
                    errors.push({
                        row: rowNumber,
                        studentName: row['Họ tên'] || row['student_name'] || 'N/A',
                        error: error.message
                    });
                }
            }

            // ========== BƯỚC 3: GHI LOG ==========
            console.log('\n📊 BƯỚC 3: Tổng kết và ghi log...');

            // Only log if we have a real user (not 'system')
            if (adminId && adminId !== 'system') {
                await LogSystemDAO.log(
                    adminId,
                    'IMPORT_REGISTRATIONS',
                    'register_forms',
                    null,
                    null,
                    {
                        success: registrations.length,
                        failed: errors.length,
                        warnings: warnings.length
                    },
                    req
                );
            }

            console.log(`\n✅ HOÀN TẤT: Import ${registrations.length} hồ sơ thành công!`);
            if (errors.length > 0) {
                console.log(`❌ Có ${errors.length} lỗi:`, errors);
            }
            if (warnings.length > 0) {
                console.log(`⚠️  Có ${warnings.length} cảnh báo:`, warnings);
            } return {
                success: registrations.length,
                failed: errors.length,
                total: rawData.length,
                errors,
                warnings
            };
        } catch (error) {
            console.error('❌ LỖI NGHIÊM TRỌNG:', error.message);
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
                throw new Error('Registration not found');
            }

            await RegisterFormDAO.update(id, data);

            // Log action
            await LogSystemDAO.log(
                adminId,
                'UPDATE_REGISTRATION',
                'register_forms',
                id,
                oldData,
                data,
                req
            );

            return await RegisterFormDAO.findById(id);
        } catch (error) {
            throw new Error(`Update registration failed: ${error.message}`);
        }
    }
}

module.exports = new RegistrationService();
