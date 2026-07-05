/**
 * fake-invoices.js
 * Tạo hóa đơn tháng hiện tại (tháng đang thu tiền = now-1):
 *   - 170 hóa đơn: ĐÃ THANH TOÁN
 *   -  20 hóa đơn: CHƯA THANH TOÁN
 *   -  10 hóa đơn: QUÁ HẠN (tháng now-2)
 * Tổng luôn = 200, lấy đúng 200 phòng đầu tiên có sinh viên.
 * Tự động cập nhật tháng mỗi lần chạy.
 *
 * Chạy: node scripts/fake-invoices.js
 */

const pool = require("../src/config/database");

const formatLocalDate = (date) => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function generateFakeInvoices() {
  try {
    console.log("� Bắt đầu tạo fake data cho hóa đơn...");

    // Lấy 200 phòng có sinh viên (kể cả hợp đồng Expired)
    // Dùng capacity của phòng thay vì COUNT contracts để tránh đếm trùng
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
      throw new Error("Không tìm thấy phòng nào có sinh viên. Vui lòng chạy fake-student-contracts.js trước!");
    }
    console.log(`📦 Đã tìm thấy ${rooms.length} phòng để tạo hóa đơn`);

    const now        = new Date();
    const timestamp  = Date.now();
    const paymentMethods = ["Tiền mặt", "Chuyển khoản", "Ví điện tử"];

    // Tháng billing: now-1 (tháng đang thu tiền), now-2 (tháng quá hạn)
    const billingMain = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const billingOver = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const dueDateMain = new Date(now.getFullYear(), now.getMonth(), 10);
    const dueDateOver = new Date(now.getFullYear(), now.getMonth() - 1, 10);

    const fmtMonth = (d) => `tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
    const fmtDate  = (d) => `${d.getDate()}/${d.getMonth() + 1}`;

    // Xóa hóa đơn cũ của 2 tháng này để tránh conflict
    await pool.query(`DELETE FROM invoices WHERE billing_month IN ($1, $2) AND id LIKE 'invoice-%'`,
      [formatLocalDate(billingMain), formatLocalDate(billingOver)]);

    const invoices = [];

    const buildInvoice = (room, idx, billingMonth, dueDate, status, paidAt, paymentMethod, penaltyAmount, suffix) => {
      const occupancy     = Math.max(Number(room.current_occupancy) || 1, 1);
      const rentPerPerson = 0;
      const rentAmount    = 0;
      const electricEnd   = randInt(200, 260); // 700k - 910k
      const electricRate  = 3500;
      const electricAmount = electricEnd * electricRate;
      const waterEnd      = randInt(10, 13);  // 150k - 195k
      const waterRate     = 15000;
      const waterAmount   = waterEnd * waterRate;
      const garbageFee    = 30000;
      const internetFee   = 100000;
      const parkingCount  = randInt(1, Math.max(1, Math.floor(occupancy / 2)));
      const parkingFee    = 50000 * parkingCount;
      const serviceFees   = garbageFee + internetFee + parkingFee;
      const totalAmount   = rentAmount + electricAmount + waterAmount + serviceFees + penaltyAmount;
      const randomStr     = Math.random().toString(36).substring(2, 15);
      const invoiceId     = `invoice-${suffix}-${timestamp - idx * 1000}-${randomStr}`;
      const invoiceNumber = `HD-${billingMonth.getFullYear()}${(billingMonth.getMonth() + 1).toString().padStart(2, "0")}-${(10000 + idx).toString()}`;
      const meterAt       = new Date(billingMonth.getFullYear(), billingMonth.getMonth() + 1, randInt(1, 4)).toISOString();

      return {
        id: invoiceId, room_id: room.room_id, invoice_number: invoiceNumber,
        billing_month: formatLocalDate(billingMonth),
        rent_per_person: rentPerPerson, occupancy, rent_amount: rentAmount,
        electric_start: 0, electric_end: electricEnd, electric_rate: electricRate, electric_amount: electricAmount,
        water_start: 0, water_end: waterEnd, water_rate: waterRate, water_amount: waterAmount,
        garbage_fee: garbageFee, internet_fee: internetFee,
        parking_fee_per_vehicle: 50000, parking_count: parkingCount, parking_fee: parkingFee,
        service_fees: serviceFees, discount_amount: 0, penalty_amount: penaltyAmount,
        total_amount: totalAmount, status,
        due_date: formatLocalDate(dueDate),
        paid_at: paidAt ? paidAt.toISOString() : null,
        payment_method: paymentMethod,
        payment_reference: paymentMethod ? `REF-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}` : null,
        note: status === "Quá hạn" ? "Hóa đơn đã quá hạn thanh toán." : null,
        created_by: "admin-1",
        created_at: new Date(billingMonth).toISOString(),
        updated_at: new Date().toISOString(),
        meter_submitted_by:   room.sample_user_id   || null,
        meter_submitted_at:   meterAt,
        meter_submitter_name: room.sample_user_name || null,
      };
    };

    // 170 ĐÃ THANH TOÁN (phòng 0-169)
    for (let i = 0; i < 170; i++) {
      const room = rooms[i % rooms.length];
      const paidDay = randInt(1, 8);
      const paidAt  = new Date(now.getFullYear(), now.getMonth(), paidDay);
      const pm      = paymentMethods[randInt(0, 2)];
      invoices.push(buildInvoice(room, i, billingMain, dueDateMain, "Đã thanh toán", paidAt, pm, 0, "paid"));
    }

    // 20 CHƯA THANH TOÁN (phòng 170-189)
    for (let i = 0; i < 20; i++) {
      const room = rooms[(170 + i) % rooms.length];
      invoices.push(buildInvoice(room, 170 + i, billingMain, dueDateMain, "Chưa thanh toán", null, null, 0, "unpaid"));
    }

    // 10 QUÁ HẠN tháng trước (phòng 190-199)
    for (let i = 0; i < 10; i++) {
      const room = rooms[(190 + i) % rooms.length];
      const penalty = randInt(50000, 150000);
      invoices.push(buildInvoice(room, 190 + i, billingOver, dueDateOver, "Quá hạn", null, null, penalty, "overdue"));
    }

    // Insert
    console.log(`\n📝 Đang insert ${invoices.length} invoices vào database...`);
    for (let i = 0; i < invoices.length; i += 50) {
      const batch = invoices.slice(i, i + 50);
      const values = batch.map(inv =>
        `('${inv.id}', '${inv.room_id}', '${inv.invoice_number}', '${inv.billing_month}', ` +
        `${inv.rent_per_person}, ${inv.occupancy}, ${inv.rent_amount}, ` +
        `${inv.electric_start}, ${inv.electric_end}, ${inv.electric_rate}, ${inv.electric_amount}, ` +
        `${inv.water_start}, ${inv.water_end}, ${inv.water_rate}, ${inv.water_amount}, ` +
        `${inv.garbage_fee}, ${inv.internet_fee}, ` +
        `${inv.parking_fee_per_vehicle}, ${inv.parking_count}, ${inv.parking_fee}, ` +
        `${inv.service_fees}, ${inv.discount_amount}, ${inv.penalty_amount}, ${inv.total_amount}, ` +
        `'${inv.status}', '${inv.due_date}', ` +
        `${inv.paid_at ? `'${inv.paid_at}'` : "NULL"}, ` +
        `${inv.payment_method ? `'${inv.payment_method}'` : "NULL"}, ` +
        `${inv.payment_reference ? `'${inv.payment_reference}'` : "NULL"}, ` +
        `${inv.note ? `'${inv.note.replace(/'/g, "''")}'` : "NULL"}, ` +
        `'${inv.created_by}', '${inv.created_at}', '${inv.updated_at}', ` +
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
      console.log(`   ✓ Đã insert ${Math.min(i + 50, invoices.length)}/${invoices.length} invoices`);
    }

    console.log(`\n✅ Đã tạo thành công ${invoices.length} hóa đơn!`);
    console.log(`\n📊 Tổng quan:`);
    console.log(`   - 170 đã thanh toán  → ${fmtMonth(billingMain)} (hạn ${fmtDate(dueDateMain)})`);
    console.log(`   -  20 chưa thanh toán → ${fmtMonth(billingMain)} (hạn ${fmtDate(dueDateMain)})`);
    console.log(`   -  10 quá hạn         → ${fmtMonth(billingOver)} (hạn ${fmtDate(dueDateOver)}, slot cuối = phòng xu4ns0n)`);
    console.log(`   ✓ Slot quá hạn cuối dùng phòng ngẫu nhiên trong 200 phòng đã chọn`);

  } catch (error) {
    console.error("❌ Lỗi khi tạo fake data:", error);
  } finally {
    await pool.end();
  }
}

generateFakeInvoices();
