/**
 * Script reset database (xóa và tạo lại)
 * CẢNH BÁO: Script này sẽ XÓA TẤT CẢ dữ liệu
 * Chạy: npm run reset-db
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'dormitory_system',
});

function askConfirmation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('⚠️  CẢNH BÁO: Bạn có chắc muốn XÓA TẤT CẢ dữ liệu? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function resetDatabase() {
  try {
    // Xác nhận trước khi xóa
    const confirmed = await askConfirmation();
    
    if (!confirmed) {
      console.log('\n❌ Đã hủy thao tác reset database');
      process.exit(0);
    }

    console.log('\n🔄 Đang kết nối tới database...');
    
    // Bước 1: Xóa tất cả các bảng với CASCADE
    console.log('🗑️  Bước 1: Xóa toàn bộ dữ liệu cũ...');
    await pool.query(`
      DROP TABLE IF EXISTS log_system CASCADE;
      DROP TABLE IF EXISTS disciplinary_records CASCADE;
      DROP TABLE IF EXISTS asset_movements CASCADE;
      DROP TABLE IF EXISTS asset_maintenance CASCADE;
      DROP TABLE IF EXISTS assets CASCADE;
      DROP TABLE IF EXISTS asset_categories CASCADE;
      DROP TABLE IF EXISTS feedbacks CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS invoices CASCADE;
      DROP TABLE IF EXISTS student_contracts CASCADE;
      DROP TABLE IF EXISTS rooms CASCADE;
      DROP TABLE IF EXISTS register_forms CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Bước 2: Xóa các ENUM types
    console.log('🗑️  Bước 2: Xóa các ENUM types...');
    await pool.query(`
      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS gender_type CASCADE;
      DROP TYPE IF EXISTS registration_status CASCADE;
      DROP TYPE IF EXISTS ai_suggestion_type CASCADE;
      DROP TYPE IF EXISTS room_status CASCADE;
      DROP TYPE IF EXISTS contract_status CASCADE;
      DROP TYPE IF EXISTS bill_status CASCADE;
      DROP TYPE IF EXISTS notification_type CASCADE;
      DROP TYPE IF EXISTS target_audience CASCADE;
      DROP TYPE IF EXISTS feedback_category CASCADE;
      DROP TYPE IF EXISTS feedback_sentiment CASCADE;
      DROP TYPE IF EXISTS feedback_status CASCADE;
      DROP TYPE IF EXISTS asset_status CASCADE;
      DROP TYPE IF EXISTS asset_condition CASCADE;
      DROP TYPE IF EXISTS movement_type CASCADE;
      DROP TYPE IF EXISTS maintenance_status CASCADE;
      DROP TYPE IF EXISTS violation_type CASCADE;
      DROP TYPE IF EXISTS disciplinary_status CASCADE;
      DROP TYPE IF EXISTS disciplinary_level CASCADE;
    `);

    // Bước 3: Xóa function nếu có
    console.log('🗑️  Bước 3: Xóa các functions...');
    await pool.query(`
      DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    `);
    
    // Bước 4: Đọc và thực thi schema.sql
    console.log('🚀 Bước 4: Đang tạo lại database schema...\n');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Thực thi toàn bộ schema
    await pool.query(schema);
    
    console.log('\n✅ Reset database thành công!');
    console.log('📊 Database đã được tạo mới với dữ liệu mẫu');
    
  } catch (error) {
    console.error('\n❌ Lỗi:', error.message);
    console.error('\n🔍 Chi tiết lỗi:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

console.log('═══════════════════════════════════════════════════');
console.log('  DORMITORY SYSTEM - DATABASE RESET');
console.log('═══════════════════════════════════════════════════\n');

resetDatabase();
