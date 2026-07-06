/**
 * scheduler.js
 * Các tác vụ chạy nền định kỳ của server.
 */

const db = require('../config/database');

/**
 * Ngày 6 hàng tháng: tự động fill electric_end=100, water_end=100
 * cho các hóa đơn tháng trước chưa có số liệu sinh viên gửi.
 */
async function fillDefaultMeterReadings() {
    try {
        const now = new Date();
        // Chỉ chạy vào ngày 6
        if (now.getDate() !== 6) return;

        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const billingMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;

        // Tìm hóa đơn tháng trước chưa có meter_submitted_by và chưa thanh toán
        const result = await db.query(`
            SELECT id, electric_start, electric_rate, water_start, water_rate,
                   rent_amount, service_fees, discount_amount, penalty_amount
            FROM invoices
            WHERE billing_month = $1
              AND meter_submitted_by IS NULL
              AND status != 'Đã thanh toán'
              AND deleted_at IS NULL
        `, [billingMonthStr]);

        if (result.rows.length === 0) return;

        const DEFAULT_ELECTRIC = 100;
        const DEFAULT_WATER    = 100;

        for (const inv of result.rows) {
            const electricAmount = (DEFAULT_ELECTRIC - Number(inv.electric_start)) * Number(inv.electric_rate);
            const waterAmount    = (DEFAULT_WATER    - Number(inv.water_start))    * Number(inv.water_rate);
            const totalAmount    = Number(inv.rent_amount) + electricAmount + waterAmount
                                 + Number(inv.service_fees) - Number(inv.discount_amount) + Number(inv.penalty_amount);

            await db.query(`
                UPDATE invoices SET
                    electric_end         = $1,
                    electric_amount      = $2,
                    water_end            = $3,
                    water_amount         = $4,
                    total_amount         = $5,
                    meter_submitter_name = 'Mặc định (hệ thống)',
                    meter_submitted_at   = NOW(),
                    updated_at           = NOW()
                WHERE id = $6
            `, [DEFAULT_ELECTRIC, electricAmount, DEFAULT_WATER, waterAmount, totalAmount, inv.id]);
        }

        console.log(`[Scheduler] ✅ Đã fill mặc định ${result.rows.length} hóa đơn chưa có số điện/nước (${billingMonthStr})`);
    } catch (err) {
        console.error('[Scheduler] ❌ Lỗi fill mặc định số điện/nước:', err.message);
    }
}

/**
 * Gửi email nhắc gia hạn tự động cho các hợp đồng còn <= 35 ngày.
 * Gửi tối đa 1 lần/tuần cho mỗi hợp đồng.
 */
async function sendExpiryReminders() {
    try {
        const ContractService = require('../services/ContractService');

        // Lấy hợp đồng Active còn ≤ 35 ngày
        const expiring = await ContractService.getExpiringContracts(35);
        
        // Lọc những hợp đồng chưa nhắc hoặc lần nhắc cuối cách đây >= 7 ngày
        const toNotify = expiring.filter(c => {
            if (!c.renewal_reminded_at) return true;
            const lastSent = new Date(c.renewal_reminded_at);
            const daysSinceLast = (Date.now() - lastSent) / (1000 * 60 * 60 * 24);
            return daysSinceLast >= 7; // Gửi tối đa 1 lần/tuần
        });

        if (toNotify.length === 0) {
            console.log(`[Scheduler] 📅 Không có hợp đồng nào cần gửi email nhắc gia hạn hôm nay.`);
            return;
        }

        const ids = toNotify.map(c => c.id);
        const result = await ContractService.sendRenewalReminders(ids, 'system', null);

        // Cập nhật ngày nhắc renewal_reminded_at trong DB cho các hợp đồng đã gửi thành công
        if (result.details && result.details.sent && result.details.sent.length > 0) {
            await db.query(
                `UPDATE student_contracts 
                 SET renewal_reminded_at = NOW() 
                 WHERE id = ANY($1::text[])`,
                [result.details.sent]
            );
        }

        console.log(`[Scheduler] ✅ Gửi email nhắc gia hạn tự động: ${result.sent} thành công, ${result.failed} thất bại`);
    } catch (err) {
        console.error('[Scheduler] ❌ Lỗi gửi email nhắc gia hạn tự động:', err.message);
    }
}

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
    fillDefaultMeterReadings(); // Chạy ngay khi start (nếu đúng ngày 6)
    sendExpiryReminders();      // Chạy ngay khi start để quét và gửi email nhắc

    // Tính ms đến 00:01 sáng hôm sau rồi lặp mỗi 24h
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setDate(now.getDate() + 1);
    nextRun.setHours(0, 1, 0, 0);
    const msUntilNextRun = nextRun - now;

    setTimeout(() => {
        runOverdueUpdate();
        fillDefaultMeterReadings();
        sendExpiryReminders();
        setInterval(() => {
            runOverdueUpdate();
            fillDefaultMeterReadings();
            sendExpiryReminders();
        }, 24 * 60 * 60 * 1000);
    }, msUntilNextRun);

    console.log(`[Scheduler] 📅 Lần chạy kế tiếp: ${nextRun.toLocaleString('vi-VN')}`);
}

module.exports = { startOverdueScheduler };
