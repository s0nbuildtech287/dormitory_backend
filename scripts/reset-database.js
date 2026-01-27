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
  password: process.env.DB_PASSWORD || 'your_password',
  database: process.env.DB_NAME || 'dormitory_db',
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
    
    // Đọc file schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🗑️  Đang xóa toàn bộ dữ liệu cũ...');
    console.log('🚀 Đang tạo lại database schema...\n');
    
    // Thực thi toàn bộ schema (bao gồm DROP và CREATE)
    await pool.query(schema);
    
    console.log('\n✅ Reset database thành công!');
    console.log('📊 Database đã được tạo mới với dữ liệu mẫu');
    
  } catch (error) {
    console.error('\n❌ Lỗi:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

console.log('═══════════════════════════════════════════════════');
console.log('  DORMITORY SYSTEM - DATABASE RESET');
console.log('═══════════════════════════════════════════════════\n');

resetDatabase();
