/**
 * Migration: Thêm cột hard_copy_received và email_sent_at vào bảng student_contracts
 * Chạy: node scripts/migrate-contract-fields.js
 */

const db = require("../src/config/database");

async function migrate() {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const col1 = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'student_contracts' AND column_name = 'hard_copy_received'
    `);
    if (col1.rows.length === 0) {
      await client.query(`
        ALTER TABLE student_contracts
        ADD COLUMN hard_copy_received BOOLEAN NOT NULL DEFAULT FALSE
      `);
      console.log("✅ Đã thêm cột hard_copy_received");
    } else {
      console.log("ℹ️  hard_copy_received đã tồn tại, bỏ qua.");
    }

    const col2 = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'student_contracts' AND column_name = 'email_sent_at'
    `);
    if (col2.rows.length === 0) {
      await client.query(`
        ALTER TABLE student_contracts
        ADD COLUMN email_sent_at TIMESTAMP
      `);
      console.log("✅ Đã thêm cột email_sent_at");
    } else {
      console.log("ℹ️  email_sent_at đã tồn tại, bỏ qua.");
    }

    await client.query("COMMIT");
    console.log("🎉 Migration hoàn tất!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration thất bại:", err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
