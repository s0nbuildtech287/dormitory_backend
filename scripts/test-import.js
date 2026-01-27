/**
 * SCRIPT TEST IMPORT EXCEL
 * Chạy script này để test logic import mà không cần setup Postman
 * 
 * Cách chạy:
 * 1. Đảm bảo PostgreSQL đang chạy
 * 2. Database đã được tạo và có dữ liệu
 * 3. Chạy: node scripts/test-import.js
 */

const path = require('path');
const RegistrationService = require('../src/services/RegistrationService');

async function testImport() {
    console.log('🚀 BẮT ĐẦU TEST IMPORT EXCEL\n');
    console.log('='.repeat(60));

    try {
        // Đường dẫn đến file CSV mẫu
        const sampleFile = path.join(__dirname, '../templates/registration_sample.csv');
        console.log(`📂 File test: ${sampleFile}\n`);

        // Giả lập adminId (trong thực tế lấy từ JWT token)
        const adminId = 'admin-001';

        // Giả lập request object cho log
        const mockReq = {
            ip: '127.0.0.1',
            headers: {
                'user-agent': 'Test Script'
            }
        };

        console.log('⏳ Đang import...\n');
        console.log('='.repeat(60));
        console.log();

        // Gọi service import
        const result = await RegistrationService.importFromExcel(sampleFile, adminId, mockReq);

        console.log('\n' + '='.repeat(60));
        console.log('📊 KẾT QUẢ IMPORT:');
        console.log('='.repeat(60));
        console.log(`✅ Tổng số dòng:     ${result.total}`);
        console.log(`✅ Import thành công: ${result.success}`);
        console.log(`❌ Lỗi:              ${result.failed}`);
        console.log(`⚠️  Cảnh báo:         ${result.warnings.length}`);
        console.log('='.repeat(60));

        // Hiển thị chi tiết errors nếu có
        if (result.errors.length > 0) {
            console.log('\n❌ CHI TIẾT LỖI:');
            console.log('-'.repeat(60));
            result.errors.forEach((error, index) => {
                console.log(`${index + 1}. Dòng ${error.row}: ${error.studentName}`);
                console.log(`   Lỗi: ${error.error}`);
            });
            console.log('-'.repeat(60));
        }

        // Hiển thị chi tiết warnings nếu có
        if (result.warnings.length > 0) {
            console.log('\n⚠️  CHI TIẾT CẢNH BÁO:');
            console.log('-'.repeat(60));
            result.warnings.forEach((warning, index) => {
                console.log(`${index + 1}. Dòng ${warning.row}: ${warning.message}`);
            });
            console.log('-'.repeat(60));
        }

        console.log('\n✅ TEST HOÀN THÀNH!\n');

    } catch (error) {
        console.error('\n❌ LỖI NGHIÊM TRỌNG:');
        console.error('='.repeat(60));
        console.error(error.message);
        console.error(error.stack);
        console.error('='.repeat(60));
        process.exit(1);
    }
}

// Chạy test
testImport();
