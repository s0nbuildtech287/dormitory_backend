/**
 * fake-invoices-history.js
 * Tạo hóa đơn lịch sử cho tất cả 200 phòng trong 5 tháng gần nhất:
 *   - Tháng 1/2026 (Jan)
 *   - Tháng 12/2025 (Dec)
 *   - Tháng 11/2025 (Nov)
 *   - Tháng 10/2025 (Oct)
 *   - Tháng 9/2025 (Sep)
 *
 * Tháng 2/2026 đã có sẵn dữ liệu từ fake-invoices.js
 * Dữ liệu có dao động nhẹ về điện/nước mỗi tháng để biểu đồ trông thực tế
 *
 * Chạy: node scripts/fake-invoices-history.js
 */

const pool = require("../src/config/database");

// Format date to local YYYY-MM-DD
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

        // Lấy tất cả phòng có người ở
        const roomsResult = await pool.query(`
      SELECT
        r.id as room_id,
        r.room_number,
        r.building,
        r.current_occupancy
      FROM rooms r
      WHERE r.current_occupancy > 0
      ORDER BY r.id
    `);

        const rooms = roomsResult.rows;
        if (rooms.length === 0) {
            throw new Error("Không tìm thấy phòng nào có người ở. Chạy fake-student-contracts.js trước!");
        }
        console.log(`📦 Tìm thấy ${rooms.length} phòng có người ở`);

        // 5 tháng lịch sử cần tạo (từ mới nhất đến cũ nhất)
        // Tháng 2/2026 đã có → bắt đầu từ tháng 1/2026
        const historyMonths = [
            { year: 2026, month: 0 },  // Tháng 1/2026 (month index 0)
            { year: 2025, month: 11 }, // Tháng 12/2025
            { year: 2025, month: 10 }, // Tháng 11/2025
            { year: 2025, month: 9 },  // Tháng 10/2025
            { year: 2025, month: 8 },  // Tháng 9/2025
        ];

        const paymentMethods = ["Tiền mặt", "Chuyển khoản", "Ví điện tử"];
        let totalInserted = 0;
        let skipped = 0;

        for (let monthIdx = 0; monthIdx < historyMonths.length; monthIdx++) {
            const { year, month } = historyMonths[monthIdx];
            const billingDate = new Date(year, month, 1);
            const billingMonthStr = formatLocalDate(billingDate);
            const dueDateObj = new Date(year, month + 1, 10); // Hạn đóng ngày 10 tháng tiếp
            const dueDateStr = formatLocalDate(dueDateObj);
            const monthLabel = `${month + 1}/${year}`;

            console.log(`\n📅 Đang xử lý tháng ${monthLabel} (${rooms.length} phòng)...`);

            // Check per-room thay vì per-month để tránh skip cả tháng khi chỉ có 1 vài phòng đã có data
            const existResult = await pool.query(
                `SELECT room_id FROM invoices WHERE billing_month = $1 AND deleted_at IS NULL`,
                [billingMonthStr]
            );
            const existingRoomIds = new Set(existResult.rows.map(r => r.room_id));
            const roomsToInsert = rooms.filter(r => !existingRoomIds.has(r.room_id));

            if (roomsToInsert.length === 0) {
                console.log(`   ⚠️  Tháng ${monthLabel} đã đủ ${existingRoomIds.size} hóa đơn → bỏ qua`);
                skipped += rooms.length;
                continue;
            }
            if (existingRoomIds.size > 0) {
                console.log(`   ℹ️  Tháng ${monthLabel}: ${existingRoomIds.size} phòng đã có → chỉ insert thêm ${roomsToInsert.length} phòng còn lại`);
            }

            const invoices = [];
            const timestamp = Date.now();

            for (let i = 0; i < roomsToInsert.length; i++) {
                const room = roomsToInsert[i];
                const occupancy = room.current_occupancy || 3;

                // ----- Tiền phòng -----
                const rentPerPerson = 500000;
                const rentAmount = rentPerPerson * occupancy;

                // ----- Điện: dao động để biểu đồ thực tế -----
                // Tháng hè (6-8) tiêu thụ nhiều hơn, tháng đông ít hơn
                const seasonFactor = (month >= 5 && month <= 8) ? 1.3 : 1.0;
                const electricEnd = Math.round(randInt(45, 90) * seasonFactor);
                const electricStart = 0;
                const electricRate = 3500;
                const electricAmount = electricEnd * electricRate;

                // ----- Nước -----
                const waterEnd = randInt(3, 8);
                const waterStart = 0;
                const waterRate = 15000;
                const waterAmount = waterEnd * waterRate;

                // ----- Dịch vụ -----
                const garbageFee = 70000;
                const internetFee = 300000;
                const parkingFeePerVehicle = 50000;
                const parkingCount = randInt(1, occupancy);
                const parkingFee = parkingFeePerVehicle * parkingCount;
                const serviceFees = garbageFee + internetFee + parkingFee;

                // ----- Tổng -----
                const discountAmount = 0;
                const penaltyAmount = 0;
                const totalAmount = rentAmount + electricAmount + waterAmount + serviceFees;

                // ----- Trạng thái: tất cả tháng lịch sử đều ĐÃ THANH TOÁN -----
                const status = "Đã thanh toán";
                // Ngày thanh toán ngẫu nhiên từ ngày 1-9 của tháng tiếp theo (trước hạn)
                const paidDay = randInt(1, 9);
                const paidAt = new Date(year, month + 1, paidDay).toISOString();
                const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

                // ----- ID & số hóa đơn -----
                const randomStr = Math.random().toString(36).substring(2, 15);
                const invoiceId = `invoice-hist-${timestamp}-${i}-${randomStr}`;
                const seq = (20000 + i + monthIdx * rooms.length).toString();
                const invoiceNumber = `HD-${year}${(month + 1).toString().padStart(2, "0")}-${seq}`;

                const createdAt = new Date(year, month, 1).toISOString();

                invoices.push({
                    id: invoiceId,
                    room_id: room.room_id,
                    invoice_number: invoiceNumber,
                    billing_month: billingMonthStr,
                    rent_per_person: rentPerPerson,
                    occupancy,
                    rent_amount: rentAmount,
                    electric_start: electricStart,
                    electric_end: electricEnd,
                    electric_rate: electricRate,
                    electric_amount: electricAmount,
                    water_start: waterStart,
                    water_end: waterEnd,
                    water_rate: waterRate,
                    water_amount: waterAmount,
                    garbage_fee: garbageFee,
                    internet_fee: internetFee,
                    parking_fee_per_vehicle: parkingFeePerVehicle,
                    parking_count: parkingCount,
                    parking_fee: parkingFee,
                    service_fees: serviceFees,
                    discount_amount: discountAmount,
                    penalty_amount: penaltyAmount,
                    total_amount: totalAmount,
                    status,
                    due_date: dueDateStr,
                    paid_at: paidAt,
                    payment_method: paymentMethod,
                    payment_reference: `REF-${timestamp}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
                    note: null,
                    created_by: "admin-1",
                    created_at: createdAt,
                    updated_at: new Date().toISOString(),
                });
            }

            // Insert theo batch 50
            for (let b = 0; b < invoices.length; b += 50) {
                const batch = invoices.slice(b, b + 50);
                const values = batch.map(
                    (inv) =>
                        `('${inv.id}', '${inv.room_id}', '${inv.invoice_number}', ` +
                        `'${inv.billing_month}', ` +
                        `${inv.rent_per_person}, ${inv.occupancy}, ${inv.rent_amount}, ` +
                        `${inv.electric_start}, ${inv.electric_end}, ${inv.electric_rate}, ${inv.electric_amount}, ` +
                        `${inv.water_start}, ${inv.water_end}, ${inv.water_rate}, ${inv.water_amount}, ` +
                        `${inv.garbage_fee}, ${inv.internet_fee}, ` +
                        `${inv.parking_fee_per_vehicle}, ${inv.parking_count}, ${inv.parking_fee}, ` +
                        `${inv.service_fees}, ` +
                        `${inv.discount_amount}, ${inv.penalty_amount}, ` +
                        `${inv.total_amount}, '${inv.status}', '${inv.due_date}', ` +
                        `'${inv.paid_at}', '${inv.payment_method}', '${inv.payment_reference}', ` +
                        `NULL, '${inv.created_by}', '${inv.created_at}', '${inv.updated_at}')`
                );

                const query = `
          INSERT INTO invoices (
            id, room_id, invoice_number, billing_month,
            rent_per_person, occupancy, rent_amount,
            electric_start, electric_end, electric_rate, electric_amount,
            water_start, water_end, water_rate, water_amount,
            garbage_fee, internet_fee,
            parking_fee_per_vehicle, parking_count, parking_fee,
            service_fees,
            discount_amount, penalty_amount, total_amount,
            status, due_date, paid_at, payment_method, payment_reference,
            note, created_by, created_at, updated_at
          ) VALUES ${values.join(", ")}
          ON CONFLICT (id) DO NOTHING;
        `;
                await pool.query(query);
                console.log(`   ✓ Tháng ${monthLabel}: ${Math.min(b + 50, invoices.length)}/${invoices.length}`);
            }

            totalInserted += invoices.length;
        }

        console.log(`\n✅ Hoàn tất! Đã insert ${totalInserted} hóa đơn lịch sử.`);
        if (skipped > 0) console.log(`   ⚠️  Bỏ qua ${skipped} (tháng đã có data)`);
        console.log(`\n📊 Tổng: ~${totalInserted + skipped} hóa đơn lịch sử (5 tháng × ${rooms.length} phòng)`);
    } catch (error) {
        console.error("❌ Lỗi:", error.message);
    } finally {
        await pool.end();
    }
}

generateHistoryInvoices();
