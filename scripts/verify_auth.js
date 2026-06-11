require('dotenv').config();
const AuthService = require('../src/services/AuthService');
const UserDAO = require('../src/dao/UserDAO');
const pool = require('../src/config/database');

async function verifyAuth() {
  try {
    console.log("🔍 Checking accounts in DB...");
    const adminUser = await UserDAO.findByEmail("admin");
    console.log("Admin account:", adminUser ? {
      email: adminUser.email,
      role: adminUser.role,
      staff_title: adminUser.staff_title,
      passwordLength: adminUser.password?.length
    } : "Not found");

    const superUser = await UserDAO.findByEmail("buixu4ns0n@gmail.com");
    console.log("SuperAdmin account:", superUser ? {
      email: superUser.email,
      role: superUser.role,
      passwordLength: superUser.password?.length
    } : "Not found");

    console.log("\n🔑 Testing login for 'admin' (expect STAFF)...");
    try {
      const loginAdmin = await AuthService.login("admin", "Sondeptrai123@k");
      console.log("✅ Admin login successful! Token role:", loginAdmin.user.role, "Title:", loginAdmin.user.staff_title);
    } catch (err) {
      console.error("❌ Admin login failed:", err.message);
    }

    console.log("\n🔑 Testing login for 'buixu4ns0n@gmail.com' (expect SUPER_ADMIN)...");
    try {
      const loginSuper = await AuthService.login("buixu4ns0n@gmail.com", "123");
      console.log("✅ SuperAdmin login successful! Token role:", loginSuper.user.role);
    } catch (err) {
      console.error("❌ SuperAdmin login failed:", err.message);
    }

  } catch (err) {
    console.error("❌ Verification error:", err);
  } finally {
    await pool.end();
  }
}

verifyAuth();
