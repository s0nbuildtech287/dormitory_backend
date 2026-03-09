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
        r.current_occupancy
      FROM rooms r
      WHERE r.current_occupancy >= 3
      AND r.building IN ('A', 'B')
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
    // - 170 hóa đơn đầu: Tháng 2 - ĐÃ THANH TOÁN
    // - 20 hóa đơn tiếp: Tháng 2 - CHƯA THANH TOÁN (hạn đóng 10/3)
    // - 10 hóa đơn cuối: Tháng 1 - QUÁ HẠN (hạn đóng 10/2)
    
    const paymentMethods = ["Tiền mặt", "Chuyển khoản", "Ví điện tử"];
    
    // Tạo hóa đơn cho mỗi phòng
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      
      // Xác định tháng và trạng thái
      let billingMonth, dueDate, status, paidAt, paymentMethod, penaltyAmount;
      
      if (i < 170) {
        // 170 hóa đơn đầu: Tháng 2 - ĐÃ THANH TOÁN
        billingMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Tháng 2
        dueDate = new Date(now.getFullYear(), now.getMonth(), 10); // Hạn đóng 10/3
        status = "Đã thanh toán";
        // Thanh toán trong khoảng 1-8/3
        const paidDay = Math.floor(Math.random() * 8) + 1;
        paidAt = new Date(now.getFullYear(), now.getMonth(), paidDay);
        paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        penaltyAmount = 0;
      } else if (i < 190) {
        // 20 hóa đơn tiếp: Tháng 2 - CHƯA THANH TOÁN
        billingMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Tháng 2
        dueDate = new Date(now.getFullYear(), now.getMonth(), 10); // Hạn đóng 10/3
        status = "Chưa thanh toán";
        paidAt = null;
        paymentMethod = null;
        penaltyAmount = 0;
      } else {
        // 10 hóa đơn cuối: Tháng 1 - QUÁ HẠN
        billingMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1); // Tháng 1
        dueDate = new Date(now.getFullYear(), now.getMonth() - 1, 10); // Hạn đóng 10/2
        status = "Quá hạn";
        paidAt = null;
        paymentMethod = null;
        penaltyAmount = Math.floor(Math.random() * 100000) + 50000; // Phạt 50k-150k
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
        
        invoices.push({
          id: invoiceId,
          room_id: room.room_id,
          invoice_number: invoiceNumber,
          billing_month: formatLocalDate(billingMonth),
          
          // Tiền phòng
          rent_per_person: rentPerPerson,
          occupancy: occupancy,
          rent_amount: rentAmount,
          
          // Điện
          electric_start: electricStart,
          electric_end: electricEnd,
          electric_rate: electricRate,
          electric_amount: electricAmount,
          
          // Nước
          water_start: waterStart,
          water_end: waterEnd,
          water_rate: waterRate,
          water_amount: waterAmount,
          
          // Dịch vụ
          garbage_fee: garbageFee,
          internet_fee: internetFee,
          parking_fee_per_vehicle: parkingFeePerVehicle,
          parking_count: parkingCount,
          parking_fee: parkingFee,
          service_fees: serviceFees,
          
          // Điều chỉnh
          discount_amount: discountAmount,
          penalty_amount: penaltyAmount,
          
          // Tổng
          total_amount: totalAmount,
          status,
          due_date: formatLocalDate(dueDate),
          paid_at: paidAt ? paidAt.toISOString() : null,
          payment_method: paymentMethod,
          payment_reference: paymentMethod ? `REF-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}` : null,
          note: status === "Quá hạn" ? "Hóa đơn đã quá hạn thanh toán. Vui lòng thanh toán sớm để tránh bị phạt thêm." : null,
          created_by: "admin-1",
          created_at: createdAt.toISOString(),
          updated_at: new Date().toISOString()
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
        `'${invoice.created_by}', '${invoice.created_at}', '${invoice.updated_at}')`
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
      console.log(`   ✓ Đã insert ${Math.min((i + 50), invoices.length)}/${invoices.length} invoices`);
    }

    // Thống kê
    const paidCount = invoices.filter(inv => inv.status === "Đã thanh toán").length;
    const unpaidCount = invoices.filter(inv => inv.status === "Chưa thanh toán").length;
    const overdueCount = invoices.filter(inv => inv.status === "Quá hạn").length;

    console.log(`\n✅ Đã tạo thành công ${invoices.length} hóa đơn fake data!`);
    console.log(`\n📊 Tổng quan theo trạng thái:`);
    console.log(`   - ${paidCount} hóa đơn đã thanh toán (tháng 2, đã thanh toán 1-8/3)`);
    console.log(`   - ${unpaidCount} hóa đơn chưa thanh toán (tháng 2, hạn đóng 10/3)`);
    console.log(`   - ${overdueCount} hóa đơn quá hạn (tháng 1, hạn đóng 10/2)`);
    console.log(`\n💰 Chi tiết giá:`);
    console.log(`   - Tiền phòng: 500,000 VNĐ/người × 3-5 người = 1,500,000-2,500,000 VNĐ`);
    console.log(`   - Điện: 3,500 VNĐ/kWh (tiêu thụ 50-100 kWh/tháng)`);
    console.log(`   - Nước: 15,000 VNĐ/m³ (tiêu thụ 3-8 m³/tháng)`);
    console.log(`   - Rác: 70,000 VNĐ/phòng/tháng`);
    console.log(`   - Mạng: 300,000 VNĐ/phòng/tháng`);
    console.log(`   - Gửi xe: 50,000 VNĐ/xe/tháng`);
    console.log(`   - Giảm giá: 0 VNĐ (không có giảm giá)`);
    console.log(`\n📦 Phòng:`);
    console.log(`   - ${rooms.length} phòng có >= 3 người ở toà A và B`);
    console.log(`   - Mỗi phòng có 1 hóa đơn`);
    console.log(`\n⚠️ Phân bổ:`);
    console.log(`   - 170 hóa đơn đầu: Tháng 2 (hạn 10/3) → ĐÃ THANH TOÁN (1-8/3)`);
    console.log(`   - 20 hóa đơn tiếp: Tháng 2 (hạn 10/3) → CHƯA THANH TOÁN`);
    console.log(`   - 10 hóa đơn cuối: Tháng 1 (hạn 10/2) → QUÁ HẠN, có phí phạt`);
    
  } catch (error) {
    console.error("❌ Lỗi khi tạo fake data:", error);
  } finally {
    await pool.end();
  }
}

// Chạy script
generateFakeInvoices();
