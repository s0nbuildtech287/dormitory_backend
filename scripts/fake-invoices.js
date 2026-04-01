const pool = require("../src/config/database");

async function generateFakeInvoices() {
  try {
    console.log("🚀 Bắt đầu tạo fake data cho hóa đơn...");

    // Lấy tất cả phòng có 3 người trở lên ở toà A và B
    const roomsResult = await pool.query(`
      SELECT 
        r.id as room_id,
        r.room_number,
        r.building,
        COUNT(sc.id) as current_occupancy,
        MIN(sc.user_id) as sample_user_id,
        MIN(u.full_name) as sample_user_name
      FROM rooms r
      INNER JOIN student_contracts sc ON sc.room_id = r.id AND sc.status = 'Active'
      INNER JOIN users u ON u.id = sc.user_id
      GROUP BY r.id, r.room_number, r.building
      HAVING COUNT(sc.id) >= 3
      ORDER BY r.id
    `);
    
    const rooms = roomsResult.rows;
    
    if (rooms.length === 0) {
      throw new Error("Không tìm thấy phòng nào có >= 3 sinh viên ở toà A hoặc B. Vui lòng chạy fake-student-contracts.js trước!");
    }
    
    console.log(`📦 Đã tìm thấy ${rooms.length} phòng có >= 3 sinh viên ở toà A và B để tạo hóa đơn`);

    // Format date to local YYYY-MM-DD (avoids UTC timezone offset bug with toISOString)
    const formatLocalDate = (date) => {
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const now = new Date();
    const invoices = [];
    const timestamp = Date.now();
    
    // Tạo hóa đơn cho TẤT CẢ phòng:
    // - 85% đầu: tháng (now-1) - ĐÃ THANH TOÁN
    // - 10% tiếp: tháng (now-1) - CHƯA THANH TOÁN
    // - 5% cuối: tháng (now-2) - QUÁ HẠN (tạo riêng, không phụ thuộc số phòng)

    const paymentMethods = ["Tiền mặt", "Chuyển khoản", "Ví điện tử"];
    const totalRooms = rooms.length;
    const paidCount_   = Math.floor(totalRooms * 0.85);
    const unpaidCount_ = Math.floor(totalRooms * 0.10);
    // Quá hạn: lấy 10 phòng đầu tạo thêm hóa đơn tháng (now-2)
    const overdueRooms = rooms.slice(0, Math.min(10, totalRooms));

    // Tạo hóa đơn cho mỗi phòng
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];

      let billingMonth, dueDate, status, paidAt, paymentMethod, penaltyAmount;

      if (i < paidCount_) {
        billingMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        dueDate      = new Date(now.getFullYear(), now.getMonth(), 10);
        status = "Đã thanh toán";
        const paidDay = Math.floor(Math.random() * 8) + 1;
        paidAt = new Date(now.getFullYear(), now.getMonth(), paidDay);
        paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        penaltyAmount = 0;
      } else {
        billingMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        dueDate      = new Date(now.getFullYear(), now.getMonth(), 10);
        status = "Chưa thanh toán";
        paidAt = null;
        paymentMethod = null;
        penaltyAmount = 0;
      }
        
        // Tính toán các khoản phí theo quy định mới
        const occupancy = room.current_occupancy || 3; // Số người đang ở (3-5 người)
        
        // 1. TIỀN PHÒNG: 500k/người × số người
        const rentPerPerson = 500000;
        const rentAmount = rentPerPerson * occupancy;
        
        // 2. ĐIỆN: Mỗi tháng bắt đầu từ 0, tiêu thụ 50-100 kWh
        const electricStart = 0;
        const electricEnd = Math.floor(Math.random() * 50) + 50; // Tiêu thụ 50-100 kWh trong tháng
        const electricRate = 3500;
        const electricAmount = (electricEnd - electricStart) * electricRate;
        
        // 3. NƯỚC: Mỗi tháng bắt đầu từ 0, tiêu thụ 3-8 m³
        const waterStart = 0;
        const waterEnd = Math.floor(Math.random() * 5) + 3; // Tiêu thụ 3-8 m³ trong tháng
        const waterRate = 15000;
        const waterAmount = (waterEnd - waterStart) * waterRate;
        
        // 4. DỊCH VỤ
        const garbageFee = 70000;  // 70k/phòng/tháng
        const internetFee = 300000; // 300k/phòng/tháng
        const parkingFeePerVehicle = 50000; // 50k/xe/tháng
        const parkingCount = Math.floor(Math.random() * occupancy) + 1; // 1 đến số người trong phòng
        const parkingFee = parkingFeePerVehicle * parkingCount;
        const serviceFees = garbageFee + internetFee + parkingFee;
        
        // 5. GIẢM GIÁ: Không có giảm giá
        const discountAmount = 0;
        
        // 6. TỔNG TIỀN
        const totalAmount = rentAmount + electricAmount + waterAmount + serviceFees - discountAmount + penaltyAmount;
        
        // Tạo invoice ID theo format: invoice-timestamp-randomstring
        const randomStr = Math.random().toString(36).substring(2, 15);
        const invoiceId = `invoice-${timestamp - i * 1000}-${randomStr}`;
        const invoiceNumber = `HD-${billingMonth.getFullYear()}${(billingMonth.getMonth() + 1).toString().padStart(2, "0")}-${(10000 + i).toString()}`;
        
        const createdAt = new Date(billingMonth);
        createdAt.setDate(1);
        
        // Meter reading: sinh viên gửi ngày 1-4 tháng tiếp theo
        const meterSubmittedAt = new Date(billingMonth.getFullYear(), billingMonth.getMonth() + 1, Math.floor(Math.random() * 4) + 1).toISOString();

        invoices.push({
          id: invoiceId,
          room_id: room.room_id,
          invoice_number: invoiceNumber,
          billing_month: formatLocalDate(billingMonth),
          rent_per_person: rentPerPerson,
          occupancy: occupancy,
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
          due_date: formatLocalDate(dueDate),
          paid_at: paidAt ? paidAt.toISOString() : null,
          payment_method: paymentMethod,
          payment_reference: paymentMethod ? `REF-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}` : null,
          note: status === "Quá hạn" ? "Hóa đơn đã quá hạn thanh toán. Vui lòng thanh toán sớm để tránh bị phạt thêm." : null,
          created_by: "admin-1",
          created_at: createdAt.toISOString(),
          updated_at: new Date().toISOString(),
          meter_submitted_by:   room.sample_user_id   || null,
          meter_submitted_at:   meterSubmittedAt,
          meter_submitter_name: room.sample_user_name || null,
        });
    }

    // Tạo thêm 10 hóa đơn QUÁ HẠN cho tháng (now-2)
    for (let i = 0; i < overdueRooms.length; i++) {
      const room = overdueRooms[i];
      const billingMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const dueDate      = new Date(now.getFullYear(), now.getMonth() - 1, 10);
      const occupancy    = Number(room.current_occupancy) || 3;
      const rentPerPerson = 500000;
      const rentAmount    = rentPerPerson * occupancy;
      const electricStart = 0;
      const electricEnd   = Math.floor(Math.random() * 50) + 50;
      const electricRate  = 3500;
      const electricAmount = electricEnd * electricRate;
      const waterStart = 0;
      const waterEnd   = Math.floor(Math.random() * 5) + 3;
      const waterRate  = 15000;
      const waterAmount = waterEnd * waterRate;
      const garbageFee = 70000;
      const internetFee = 300000;
      const parkingCount = Math.floor(Math.random() * occupancy) + 1;
      const parkingFee   = 50000 * parkingCount;
      const serviceFees  = garbageFee + internetFee + parkingFee;
      const penaltyAmount = Math.floor(Math.random() * 100000) + 50000;
      const totalAmount   = rentAmount + electricAmount + waterAmount + serviceFees + penaltyAmount;
      const randomStr  = Math.random().toString(36).substring(2, 15);
      const invoiceId  = `invoice-ov-${timestamp - i * 1000}-${randomStr}`;
      const invoiceNumber = `HD-${billingMonth.getFullYear()}${(billingMonth.getMonth() + 1).toString().padStart(2, "0")}-OV${(i + 1).toString().padStart(3, "0")}`;
      const meterSubmittedAt = new Date(billingMonth.getFullYear(), billingMonth.getMonth() + 1, Math.floor(Math.random() * 4) + 1).toISOString();
      invoices.push({
        id: invoiceId,
        room_id: room.room_id,
        invoice_number: invoiceNumber,
        billing_month: formatLocalDate(billingMonth),
        rent_per_person: rentPerPerson, occupancy, rent_amount: rentAmount,
        electric_start: electricStart, electric_end: electricEnd, electric_rate: electricRate, electric_amount: electricAmount,
        water_start: waterStart, water_end: waterEnd, water_rate: waterRate, water_amount: waterAmount,
        garbage_fee: garbageFee, internet_fee: internetFee,
        parking_fee_per_vehicle: 50000, parking_count: parkingCount, parking_fee: parkingFee,
        service_fees: serviceFees, discount_amount: 0, penalty_amount: penaltyAmount,
        total_amount: totalAmount, status: "Quá hạn",
        due_date: formatLocalDate(dueDate),
        paid_at: null, payment_method: null, payment_reference: null,
        note: "Hóa đơn đã quá hạn thanh toán. Vui lòng thanh toán sớm để tránh bị phạt thêm.",
        created_by: "admin-1",
        created_at: new Date(billingMonth).toISOString(),
        updated_at: new Date().toISOString(),
        meter_submitted_by:   room.sample_user_id   || null,
        meter_submitted_at:   meterSubmittedAt,
        meter_submitter_name: room.sample_user_name || null,
      });
    }

    console.log(`\n📝 Đang insert ${invoices.length} invoices vào database...`);
    
    // Insert invoices
    for (let i = 0; i < invoices.length; i += 50) {
      const batch = invoices.slice(i, i + 50);
      const values = batch.map(invoice => 
        `('${invoice.id}', '${invoice.room_id}', '${invoice.invoice_number}', ` +
        `'${invoice.billing_month}', ` +
        `${invoice.rent_per_person}, ${invoice.occupancy}, ${invoice.rent_amount}, ` +
        `${invoice.electric_start}, ${invoice.electric_end}, ${invoice.electric_rate}, ${invoice.electric_amount}, ` +
        `${invoice.water_start}, ${invoice.water_end}, ${invoice.water_rate}, ${invoice.water_amount}, ` +
        `${invoice.garbage_fee}, ${invoice.internet_fee}, ` +
        `${invoice.parking_fee_per_vehicle}, ${invoice.parking_count}, ${invoice.parking_fee}, ` +
        `${invoice.service_fees}, ` +
        `${invoice.discount_amount}, ${invoice.penalty_amount}, ` +
        `${invoice.total_amount}, '${invoice.status}', '${invoice.due_date}', ` +
        `${invoice.paid_at ? `'${invoice.paid_at}'` : "NULL"}, ` +
        `${invoice.payment_method ? `'${invoice.payment_method}'` : "NULL"}, ` +
        `${invoice.payment_reference ? `'${invoice.payment_reference}'` : "NULL"}, ` +
        `${invoice.note ? `'${invoice.note.replace(/'/g, "''")}'` : "NULL"}, ` +
        `'${invoice.created_by}', '${invoice.created_at}', '${invoice.updated_at}', ` +
        `${invoice.meter_submitted_by ? `'${invoice.meter_submitted_by}'` : "NULL"}, ` +
        `'${invoice.meter_submitted_at}', ` +
        `${invoice.meter_submitter_name ? `'${invoice.meter_submitter_name.replace(/'/g, "''")}'` : "NULL"})`
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
          note, created_by, created_at, updated_at,
          meter_submitted_by, meter_submitted_at, meter_submitter_name
        ) VALUES ${values.join(", ")}
        ON CONFLICT (id) DO NOTHING;
      `;

      await pool.query(query);
      console.log(`   ✓ Đã insert ${Math.min((i + 50), invoices.length)}/${invoices.length} invoices`);
    }

    // Thống kê
    const paidCount   = invoices.filter(inv => inv.status === "Đã thanh toán").length;
    const unpaidCount = invoices.filter(inv => inv.status === "Chưa thanh toán").length;
    const overdueCount= invoices.filter(inv => inv.status === "Quá hạn").length;

    // Tính tháng động để log minh bạch
    const billingMonthMain  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const billingMonthOver  = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const dueDateMain       = new Date(now.getFullYear(), now.getMonth(), 10);
    const dueDateOver       = new Date(now.getFullYear(), now.getMonth() - 1, 10);
    const fmtMonth = (d) => `tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
    const fmtDate  = (d) => `${d.getDate()}/${d.getMonth() + 1}`;

    console.log(`\n✅ Đã tạo thành công ${invoices.length} hóa đơn fake data!`);
    console.log(`\n📊 Tổng quan theo trạng thái:`);
    console.log(`   - ${paidCount} hóa đơn đã thanh toán (${fmtMonth(billingMonthMain)}, đã thanh toán 1-8/${now.getMonth() + 1})`);
    console.log(`   - ${unpaidCount} hóa đơn chưa thanh toán (${fmtMonth(billingMonthMain)}, hạn đóng ${fmtDate(dueDateMain)})`);
    console.log(`   - ${overdueCount} hóa đơn quá hạn (${fmtMonth(billingMonthOver)}, hạn đóng ${fmtDate(dueDateOver)})`);
    console.log(`\n💰 Chi tiết giá:`);
    console.log(`   - Tiền phòng: 500,000 VNĐ/người × 3-5 người = 1,500,000-2,500,000 VNĐ`);
    console.log(`   - Điện: 3,500 VNĐ/kWh (tiêu thụ 50-100 kWh/tháng)`);
    console.log(`   - Nước: 15,000 VNĐ/m³ (tiêu thụ 3-8 m³/tháng)`);
    console.log(`   - Rác: 70,000 VNĐ/phòng/tháng`);
    console.log(`   - Mạng: 300,000 VNĐ/phòng/tháng`);
    console.log(`   - Gửi xe: 50,000 VNĐ/xe/tháng`);
    console.log(`\n📦 Phòng: ${rooms.length} phòng có >= 3 người ở`);
    console.log(`\n⚠️ Phân bổ:`);
    console.log(`   - ${paidCount_} hóa đơn: ${fmtMonth(billingMonthMain)} (hạn ${fmtDate(dueDateMain)}) → ĐÃ THANH TOÁN`);
    console.log(`   - ${invoices.length - paidCount_ - overdueRooms.length} hóa đơn: ${fmtMonth(billingMonthMain)} (hạn ${fmtDate(dueDateMain)}) → CHƯA THANH TOÁN`);
    console.log(`   - ${overdueRooms.length} hóa đơn: ${fmtMonth(billingMonthOver)} (hạn ${fmtDate(dueDateOver)}) → QUÁ HẠN`);
    
  } catch (error) {
    console.error("❌ Lỗi khi tạo fake data:", error);
  } finally {
    await pool.end();
  }
}

// Chạy script
generateFakeInvoices();
