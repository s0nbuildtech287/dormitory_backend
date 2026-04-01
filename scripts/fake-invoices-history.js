/**
 * fake-invoices-history.js
 * Tạo hóa đơn lịch sử 5 tháng quá khứ (now-3 đến now-7):
 *   - Mỗi tháng: đúng 200 hóa đơn, tất cả ĐÃ THANH TOÁN
 * Tự động cập nhật tháng mỗi lần chạy.
 *
 * Chạy: node scripts/fake-invoices-history.js
 */

const pool = require("../src/config/database");

const formatLocalDate = (date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function generateHistoryInvoices() {
    try {
        console.log("🚀 Bắt đầu tạo fake hóa đơn lịch sử (5 tháng)...");

        // Lấy 200 phòng có sinh viên (kể cả hợp đồng Expired)
        const roomsResult = await pool.query(`
            SELECT DISTINCT
                r.id as room_id,
                r.room_number,
                r.building,
                r.capacity as current_occupancy,
                MIN(sc.user_id) OVER (PARTITION BY r.id) as sample_user_id,
                MIN(u.full_name) OVER (PARTITION BY r.id) as sample_user_name
            FROM rooms r
            INNER JOIN student_contracts sc ON sc.room_id = r.id
                AND sc.status IN ('Active', 'Expired')
            INNER JOIN users u ON u.id = sc.user_id
            ORDER BY r.id
            LIMIT 200
        `);

        const rooms = roomsResult.rows;
        if (rooms.length === 0) {
            throw new Error("Không tìm thấy phòng nào có người ở. Chạy fake-student-contracts.js trước!");
        }
        console.log(`📦 Tìm thấy ${rooms.length} phòng`);

        const now = new Date();
        const paymentMethods = ["Tiền mặt", "Chuyển khoản", "Ví điện tử"];

        // 5 tháng lịch sử: now-2, now-3, now-4, now-5, now-6
        // now-2 (tháng 2): chỉ tạo 190 đã TT (10 quá hạn đã có từ fake-invoices.js)
        // now-3 đến now-6: mỗi tháng 200 đã TT
        const historyMonths = Array.from({ length: 5 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - 2 - i, 1);
            return { year: d.getFullYear(), month: d.getMonth(), count: i === 0 ? 190 : 200 };
        });

        let totalInserted = 0;

        for (let monthIdx = 0; monthIdx < historyMonths.length; monthIdx++) {
            const { year, month, count } = historyMonths[monthIdx];
            const billingDate    = new Date(year, month, 1);
            const billingMonthStr = formatLocalDate(billingDate);
            const dueDateObj     = new Date(year, month + 1, 10);
            const dueDateStr     = formatLocalDate(dueDateObj);
            const monthLabel     = `${month + 1}/${year}`;

            console.log(`\n📅 Đang xử lý tháng ${monthLabel} (${count} hóa đơn đã TT)...`);

            // Xóa data cũ của tháng này
            await pool.query(
                `DELETE FROM invoices WHERE billing_month = $1 AND id LIKE 'invoice-hist-%'`,
                [billingMonthStr]
            );

            const invoices = [];
            const timestamp = Date.now();

            for (let i = 0; i < count; i++) {
                const room = rooms[i % rooms.length];
                const occupancy = Math.max(Number(room.current_occupancy) || 1, 1);

                const rentPerPerson = 500000;
                const rentAmount    = rentPerPerson * occupancy;

                // Điện dao động theo mùa
                const seasonFactor  = (month >= 5 && month <= 8) ? 1.3 : 1.0;
                const electricEnd   = Math.round(randInt(45, 90) * seasonFactor);
                const electricRate  = 3500;
                const electricAmount = electricEnd * electricRate;

                const waterEnd   = randInt(3, 8);
                const waterRate  = 15000;
                const waterAmount = waterEnd * waterRate;

                const garbageFee  = 70000;
                const internetFee = 300000;
                const parkingCount = randInt(1, occupancy);
                const parkingFee   = 50000 * parkingCount;
                const serviceFees  = garbageFee + internetFee + parkingFee;
                const totalAmount  = rentAmount + electricAmount + waterAmount + serviceFees;

                // Thanh toán ngày 1-9 tháng tiếp
                const paidDay = randInt(1, 9);
                const paidAt  = new Date(year, month + 1, paidDay).toISOString();
                const pm      = paymentMethods[randInt(0, 2)];

                const randomStr    = Math.random().toString(36).substring(2, 15);
                const invoiceId    = `invoice-hist-${timestamp}-${monthIdx}-${i}-${randomStr}`;
                const seq          = (20000 + i + monthIdx * 200).toString();
                const invoiceNumber = `HD-${year}${(month + 1).toString().padStart(2, "0")}-${seq}`;
                const meterAt      = new Date(year, month + 1, randInt(1, 4)).toISOString();

                invoices.push({
                    id: invoiceId, room_id: room.room_id, invoice_number: invoiceNumber,
                    billing_month: billingMonthStr,
                    rent_per_person: rentPerPerson, occupancy, rent_amount: rentAmount,
                    electric_start: 0, electric_end: electricEnd, electric_rate: electricRate, electric_amount: electricAmount,
                    water_start: 0, water_end: waterEnd, water_rate: waterRate, water_amount: waterAmount,
                    garbage_fee: garbageFee, internet_fee: internetFee,
                    parking_fee_per_vehicle: 50000, parking_count: parkingCount, parking_fee: parkingFee,
                    service_fees: serviceFees, discount_amount: 0, penalty_amount: 0,
                    total_amount: totalAmount, status: "Đã thanh toán",
                    due_date: dueDateStr, paid_at: paidAt, payment_method: pm,
                    payment_reference: `REF-${timestamp}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
                    note: null, created_by: "admin-1",
                    created_at: new Date(year, month, 1).toISOString(),
                    updated_at: new Date().toISOString(),
                    meter_submitted_by:   room.sample_user_id   || null,
                    meter_submitted_at:   meterAt,
                    meter_submitter_name: room.sample_user_name || null,
                });
            }

            // Insert theo batch 50
            for (let b = 0; b < invoices.length; b += 50) {
                const batch = invoices.slice(b, b + 50);
                const values = batch.map(inv =>
                    `('${inv.id}', '${inv.room_id}', '${inv.invoice_number}', '${inv.billing_month}', ` +
                    `${inv.rent_per_person}, ${inv.occupancy}, ${inv.rent_amount}, ` +
                    `0, ${inv.electric_end}, ${inv.electric_rate}, ${inv.electric_amount}, ` +
                    `0, ${inv.water_end}, ${inv.water_rate}, ${inv.water_amount}, ` +
                    `${inv.garbage_fee}, ${inv.internet_fee}, ` +
                    `50000, ${inv.parking_count}, ${inv.parking_fee}, ` +
                    `${inv.service_fees}, 0, 0, ${inv.total_amount}, ` +
                    `'${inv.status}', '${inv.due_date}', '${inv.paid_at}', '${inv.payment_method}', '${inv.payment_reference}', ` +
                    `NULL, '${inv.created_by}', '${inv.created_at}', '${inv.updated_at}', ` +
                    `${inv.meter_submitted_by ? `'${inv.meter_submitted_by}'` : "NULL"}, ` +
                    `'${inv.meter_submitted_at}', ` +
                    `${inv.meter_submitter_name ? `'${inv.meter_submitter_name.replace(/'/g, "''")}'` : "NULL"})`
                );
                await pool.query(`
                    INSERT INTO invoices (
                        id, room_id, invoice_number, billing_month,
                        rent_per_person, occupancy, rent_amount,
                        electric_start, electric_end, electric_rate, electric_amount,
                        water_start, water_end, water_rate, water_amount,
                        garbage_fee, internet_fee,
                        parking_fee_per_vehicle, parking_count, parking_fee,
                        service_fees, discount_amount, penalty_amount, total_amount,
                        status, due_date, paid_at, payment_method, payment_reference,
                        note, created_by, created_at, updated_at,
                        meter_submitted_by, meter_submitted_at, meter_submitter_name
                    ) VALUES ${values.join(", ")}
                    ON CONFLICT (id) DO NOTHING;
                `);
                console.log(`   ✓ Tháng ${monthLabel}: ${Math.min(b + 50, invoices.length)}/${count}`);
            }
            totalInserted += invoices.length;
        }

        console.log(`\n✅ Hoàn tất! Đã insert ${totalInserted} hóa đơn lịch sử.`);
        console.log(`📊 Phân bổ:`);
        historyMonths.forEach(({ year, month, count }) => {
            console.log(`   - Tháng ${month + 1}/${year}: ${count} hóa đơn đã TT${count === 190 ? ' (10 quá hạn đã có riêng)' : ''}`);
        });

    } catch (error) {
        console.error("❌ Lỗi:", error.message);
    } finally {
        await pool.end();
    }
}

generateHistoryInvoices();
