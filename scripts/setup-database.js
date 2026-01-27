/**
 * Script tự động tạo database schema
 * Chạy: npm run setup-db
 * Hoặc: node scripts/setup-database.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Đọc cấu hình database từ biến môi trường hoặc mặc định
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'dormitory_system',
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Đang kết nối tới database...');
    
    // Đọc file schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Đã đọc file schema.sql');
    console.log('🚀 Bắt đầu tạo database schema...\n');
    
    // Tách các câu lệnh SQL - tránh thực thi nhiều lần
    // Thực thi toàn bộ schema trong một transaction
    await client.query('BEGIN');
    await client.query(schema);
    await client.query('COMMIT');
    
    console.log('\n✅ Tạo database thành công!');
    console.log('📊 Đã tạo:');
    console.log('  - 16 bảng (users, rooms, contracts, invoices, assets...)');
    console.log('  - Tất cả ENUM types');
    console.log('  - Indexes và Triggers');
    console.log('  - Dữ liệu mẫu (admin account, rooms, asset categories)');
    console.log('\n🔐 Tài khoản admin mặc định:');
    console.log('  Email: admin@ktx.edu.vn');
    console.log('  Password: admin123');
    
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Lỗi khi tạo database:', error.message);
    console.error('\n💡 Kiểm tra:');
    console.error('  1. PostgreSQL đã chạy chưa?');
    console.error('  2. Thông tin kết nối database đúng chưa?');
    console.error('  3. Database đã tồn tại chưa? (tạo bằng: CREATE DATABASE dormitory_system;)');
    console.error('\n🔍 Chi tiết lỗi:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy script
console.log('═══════════════════════════════════════════════════');
console.log('  DORMITORY SYSTEM - DATABASE SETUP');
console.log('═══════════════════════════════════════════════════\n');

setupDatabase();
