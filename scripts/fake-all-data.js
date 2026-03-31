/**
 * fake-all-data.js
 * Chạy tuần tự tất cả các script fake data theo đúng thứ tự phụ thuộc.
 *
 * Thứ tự:
 *   1. setup-database.js        — Tạo schema
 *   2. fake-rooms.js            — Tạo 400 phòng
 *   3. fake-student-contracts.js — Tạo 1000 sinh viên + hợp đồng
 *   4. fake-invoices.js         — Tạo hóa đơn tháng hiện tại
 *   5. fake-invoices-history.js — Tạo hóa đơn 5 tháng lịch sử
 *   6. fake-assets.js           — Tạo tài sản
 *   7. fake-disciplinary.js     — Tạo phiếu kỷ luật
 *   8. fake-notifications.js    — Tạo thông báo
 *   9. fake-activity-logs.js    — Tạo 20 log hoạt động admin
 *
 * Chạy: node scripts/fake-all-data.js
 */

const { execSync } = require('child_process');
const path = require('path');

const SCRIPTS_DIR = path.join(__dirname);

const steps = [
  { file: 'setup-database.js',         label: 'Setup Database Schema' },
  { file: 'fake-rooms.js',             label: 'Fake Rooms (400 phòng)' },
  { file: 'fake-student-contracts.js', label: 'Fake Students + Contracts (1000 SV)' },
  { file: 'fake-invoices.js',          label: 'Fake Invoices (tháng hiện tại)' },
  { file: 'fake-invoices-history.js',  label: 'Fake Invoices History (5 tháng)' },
  { file: 'fake-assets.js',            label: 'Fake Assets (tài sản)' },
  { file: 'fake-disciplinary.js',      label: 'Fake Disciplinary (kỷ luật)' },
  { file: 'fake-notifications.js',     label: 'Fake Notifications (thông báo)' },
  { file: 'fake-activity-logs.js',     label: 'Fake Activity Logs (lịch sử hoạt động)' },
];

function run() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  DORMITORY SYSTEM — FAKE ALL DATA');
  console.log(`  Tổng: ${steps.length} bước`);
  console.log('═══════════════════════════════════════════════════\n');

  const startAll = Date.now();

  for (let i = 0; i < steps.length; i++) {
    const { file, label } = steps[i];
    const scriptPath = path.join(SCRIPTS_DIR, file);

    console.log(`\n[${i + 1}/${steps.length}] ▶ ${label}`);
    console.log('─'.repeat(51));

    const start = Date.now();
    try {
      execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`\n✅ Hoàn thành trong ${elapsed}s`);
    } catch (err) {
      console.error(`\n❌ Lỗi tại bước [${i + 1}] ${label}`);
      console.error('   Dừng lại. Kiểm tra lỗi bên trên và chạy lại.');
      process.exit(1);
    }
  }

  const totalElapsed = ((Date.now() - startAll) / 1000).toFixed(1);
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  ✅ HOÀN TẤT! Tổng thời gian: ${totalElapsed}s`);
  console.log('═══════════════════════════════════════════════════');
}

run();
