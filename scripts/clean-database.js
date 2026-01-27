/**
 * Script để làm sạch database trước khi setup lại
 * Chạy script này trước khi chạy setup-database.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'dormitory_system',
});

async function cleanDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('  DORMITORY SYSTEM - CLEAN DATABASE');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('🔄 Đang kết nối tới database...');
    
    // Bước 1: Xóa tất cả các bảng
    console.log('🗑️  Bước 1: Xóa tất cả các bảng...');
    
    const dropTablesQuery = `
      DO $$ 
      DECLARE
          r RECORD;
      BEGIN
          -- Xóa tất cả các bảng
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
              EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
      END $$;
    `;
    
    await client.query(dropTablesQuery);
    console.log('✅ Đã xóa tất cả các bảng');
    
    // Bước 2: Xóa tất cả các types
    console.log('🗑️  Bước 2: Xóa tất cả các ENUM types...');
    
    const dropTypesQuery = `
      DO $$ 
      DECLARE
          r RECORD;
      BEGIN
          -- Xóa tất cả các types
          FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
              EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
          END LOOP;
      END $$;
    `;
    
    await client.query(dropTypesQuery);
    console.log('✅ Đã xóa tất cả các ENUM types');
    
    // Bước 3: Xóa tất cả các functions
    console.log('🗑️  Bước 3: Xóa tất cả các functions...');
    
    const dropFunctionsQuery = `
      DO $$ 
      DECLARE
          r RECORD;
      BEGIN
          -- Xóa tất cả các functions
          FOR r IN (SELECT proname, oidvectortypes(proargtypes) as argtypes
                    FROM pg_proc 
                    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                    AND prokind = 'f') LOOP
              EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE';
          END LOOP;
      END $$;
    `;
    
    await client.query(dropFunctionsQuery);
    console.log('✅ Đã xóa tất cả các functions');
    
    console.log('\n✅ Làm sạch database thành công!');
    console.log('💡 Bây giờ bạn có thể chạy: node setup-database.js\n');
    
  } catch (error) {
    console.error('\n❌ Lỗi:', error.message);
    console.error('Chi tiết:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanDatabase();
