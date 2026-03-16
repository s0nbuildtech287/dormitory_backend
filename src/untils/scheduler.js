/**
 * scheduler.js
 * Các tác vụ chạy nền định kỳ của server.
 */

/**
 * Khởi động scheduler tự động cập nhật hóa đơn quá hạn.
 * - Chạy ngay khi server start.
 * - Chạy lại mỗi ngày lúc 00:01 giờ local.
 */
function startOverdueScheduler() {
    // Lazy-require để tránh circular dependency khi load
    const InvoiceService = require('../services/InvoiceService');

    const runOverdueUpdate = async () => {
        try {
            const result = await InvoiceService.updateOverdueInvoices();
            console.log(
                `[Scheduler] ✅ Cập nhật hóa đơn quá hạn: ${result.updated} hóa đơn` +
                ` lúc ${new Date().toLocaleString('vi-VN')}`
            );
        } catch (err) {
            console.error('[Scheduler] ❌ Lỗi cập nhật hóa đơn quá hạn:', err.message);
        }
    };

    // Chạy ngay khi server khởi động
    runOverdueUpdate();

    // Tính ms đến 00:01 sáng hôm sau rồi lặp mỗi 24h
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setDate(now.getDate() + 1);
    nextRun.setHours(0, 1, 0, 0);
    const msUntilNextRun = nextRun - now;

    setTimeout(() => {
        runOverdueUpdate();
        setInterval(runOverdueUpdate, 24 * 60 * 60 * 1000);
    }, msUntilNextRun);

    console.log(`[Scheduler] 📅 Lần chạy kế tiếp: ${nextRun.toLocaleString('vi-VN')}`);
}

module.exports = { startOverdueScheduler };
