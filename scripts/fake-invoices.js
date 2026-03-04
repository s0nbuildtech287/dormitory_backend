const pool = require("../src/config/database");

async function generateFakeInvoices() {
  try {
    console.log("🚀 Bắt đầu tạo fake data cho hóa đơn...");

    // Lấy danh sách 200 phòng đã có sinh viên
    const roomsResult = await pool.query(`
      SELECT 
        r.id as room_id,
        r.room_number,
        r.current_occupancy
      FROM rooms r
      WHERE r.current_occupancy > 0
      ORDER BY r.id
      LIMIT 200
    `);
    
    const rooms = roomsResult.rows;
    
    if (rooms.length === 0) {
      throw new Error("Không tìm thấy phòng nào có sinh viên. Vui lòng chạy fake-student-contracts.js trước!");
    }
    
    console.log(`📦 Đã tìm thấy ${rooms.length} phòng có sinh viên để tạo hóa đơn`);

    const invoices = [];
    const timestamp = Date.now();
    
    // Tạo hóa đơn cho mỗi phòng
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      
      // Tạo hóa đơn cho tháng 2 (vì hiện tại là tháng 3, phải đóng tiền tháng trước)
      const now = new Date();
      const billingMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Tháng trước
      
      // Ngày đến hạn: ngày 5 của tháng hiện tại
      const dueDate = new Date(now.getFullYear(), now.getMonth(), 5);
      
      // Xác định trạng thái hóa đơn
      let status = "Chưa thanh toán";
      let paidAt = null;
      let paymentMethod = null;
      
      // 70% hóa đơn đã thanh toán
      // 20% hóa đơn chưa thanh toán (sắp hết hạn)
      // 10% hóa đơn quá hạn
      const random = Math.random();
      
      if (random < 0.7) {
        // Đã thanh toán (70%)
        status = "Đã thanh toán";
        paidAt = new Date(billingMonth);
        paidAt.setDate(Math.floor(Math.random() * 28) + 1); // Thanh toán trong tháng 2
        paymentMethod = ["Tiền mặt", "Chuyển khoản", "Ví điện tử"][Math.floor(Math.random() * 3)];
      } else if (random < 0.9) {
        // Chưa thanh toán (20%)
        status = "Chưa thanh toán";
        // Due date vẫn là ngày 5 tháng 3
      } else {
        // Quá hạn (10%)
        status = "Quá hạn";
        // Due date đã qua (ngày 5 tháng 3 đã qua)
      }
      
      // Tính toán các khoản phí theo quy định mới
      const occupancy = room.current_occupancy || 3; // Số người đang ở (3-5 người)
      
      // 1. TIỀN PHÒNG: 500k/người × số người
      const rentPerPerson = 500000;
      const rentAmount = rentPerPerson * occupancy;
      
      // 2. ĐIỆN: Số đầu kỳ = số cuối kỳ tháng trước (giả sử tháng trước kết thúc ở 100-150)
      const electricStart = Math.floor(Math.random() * 50) + 100; // Số cuối kỳ tháng trước: 100-150 kWh
      const electricEnd = electricStart + Math.floor(Math.random() * 50) + 50; // Tiêu thụ thêm 50-100 kWh trong tháng
      const electricRate = 3500;
      const electricAmount = (electricEnd - electricStart) * electricRate;
      
      // 3. NƯỚC: Số đầu kỳ = số cuối kỳ tháng trước (giả sử tháng trước kết thúc ở 20-30)
      const waterStart = Math.floor(Math.random() * 10) + 20; // Số cuối kỳ tháng trước: 20-30 m³
      const waterEnd = waterStart + Math.floor(Math.random() * 5) + 3; // Tiêu thụ thêm 3-8 m³ trong tháng
      const waterRate = 15000;
      const waterAmount = (waterEnd - waterStart) * waterRate;
      
      // 4. DỊCH VỤ
      const garbageFee = 70000;  // 70k/phòng/tháng
      const internetFee = 300000; // 300k/phòng/tháng
      const parkingFeePerVehicle = 50000; // 50k/xe/tháng
      const parkingCount = Math.floor(Math.random() * occupancy) + 1; // 1 đến số người trong phòng
      const parkingFee = parkingFeePerVehicle * parkingCount;
      const serviceFees = garbageFee + internetFee + parkingFee;
      
      // 5. GIẢM GIÁ: 10% hóa đơn có giảm giá
      const discountAmount = Math.random() < 0.1 ? Math.floor(Math.random() * 50000) + 50000 : 0;
      
      // 6. PHÍ PHẠT: Chỉ áp dụng cho hóa đơn quá hạn
      const penaltyAmount = status === "Quá hạn" ? Math.floor(Math.random() * 100000) + 50000 : 0;
      
      // 7. TỔNG TIỀN
      const totalAmount = rentAmount + electricAmount + waterAmount + serviceFees - discountAmount + penaltyAmount;
      
      // Tạo invoice ID theo format: invoice-timestamp-randomstring
      const randomStr = Math.random().toString(36).substring(2, 15);
      const invoiceId = `invoice-${timestamp - i * 1000}-${randomStr}`;
      const invoiceNumber = `HD-${billingMonth.getFullYear()}${(billingMonth.getMonth() + 1).toString().padStart(2, "0")}-${(10000 + i).toString()}`;
      
      const createdAt = new Date(billingMonth);
      createdAt.setDate(1);
      
      invoices.push({
        id: invoiceId,
        room_id: room.room_id,  // Lưu room_id thay vì contract_id
        invoice_number: invoiceNumber,
        billing_month: billingMonth.toISOString().split("T")[0],
        
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
        due_date: dueDate.toISOString().split("T")[0],
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
    console.log(`\n📊 Tổng quan:`);
    console.log(`   - ${paidCount} hóa đơn đã thanh toán (70%)`);
    console.log(`   - ${unpaidCount} hóa đơn chưa thanh toán (20%)`);
    console.log(`   - ${overdueCount} hóa đơn quá hạn (10%)`);
    console.log(`\n💰 Chi tiết giá:`);
    console.log(`   - Tiền phòng: 500,000 VNĐ/người × ${invoices[0]?.occupancy || 3}-5 người = 1,500,000-2,500,000 VNĐ`);
    console.log(`   - Điện: 3,500 VNĐ/kWh (tiêu thụ 50-100 kWh/tháng, số đầu kỳ = số cuối kỳ tháng trước)`);
    console.log(`   - Nước: 15,000 VNĐ/m³ (tiêu thụ 3-8 m³/tháng, số đầu kỳ = số cuối kỳ tháng trước)`);
    console.log(`   - Rác: 70,000 VNĐ/phòng/tháng`);
    console.log(`   - Mạng: 300,000 VNĐ/phòng/tháng`);
    console.log(`   - Gửi xe: 50,000 VNĐ/xe/tháng (1-${invoices[0]?.occupancy || 5} xe/phòng)`);
    console.log(`\n📅 Thời gian:`);
    console.log(`   - Tháng thanh toán: Tháng 2/2026`);
    console.log(`   - Hạn thanh toán: Ngày 5/3/2026`);
    console.log(`\n📦 Phòng:`);
    console.log(`   - ${rooms.length} phòng có người ở`);
    console.log(`   - Mỗi phòng 1 hóa đơn`);
    console.log(`   - ${rooms.filter(r => r.current_occupancy === 3).length} phòng 3 người`);
    console.log(`   - ${rooms.filter(r => r.current_occupancy === 4).length} phòng 4 người`);
    console.log(`   - ${rooms.filter(r => r.current_occupancy === 5).length} phòng 5 người`);
    
  } catch (error) {
    console.error("❌ Lỗi khi tạo fake data:", error);
  } finally {
    await pool.end();
  }
}

// Chạy script
generateFakeInvoices();
