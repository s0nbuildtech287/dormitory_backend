const pool = require("../src/config/database");

async function generateFakeInvoices() {
  try {
    console.log("🚀 Bắt đầu tạo fake data cho hóa đơn...");

    // Lấy danh sách 200 phòng đã có sinh viên (có hợp đồng Active)
    const roomsResult = await pool.query(`
      SELECT DISTINCT
        r.id as room_id,
        r.room_number,
        r.rent_price,
        r.garbage_fee,
        r.internet_fee,
        r.parking_fee,
        r.current_occupancy,
        (
          SELECT sc.id 
          FROM student_contracts sc 
          WHERE sc.room_id = r.id 
          AND sc.status IN ('Active', 'Expired')
          ORDER BY sc.created_at 
          LIMIT 1
        ) as contract_id
      FROM rooms r
      WHERE r.current_occupancy > 0
      ORDER BY r.id
      LIMIT 200
    `);
    
    const rooms = roomsResult.rows;
    
    if (rooms.length === 0) {
      throw new Error("Không tìm thấy phòng nào có sinh viên. Vui lòng chạy fake-student-contracts.js trước!");
    }
    
    console.log(`📦 Đã tìm thấy ${rooms.length} phòng để tạo hóa đơn`);

    const invoices = [];
    const timestamp = Date.now();
    
    // Tạo hóa đơn cho mỗi phòng
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      
      // Tạo hóa đơn cho tháng hiện tại
      const now = new Date();
      const billingMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Ngày đến hạn: ngày 5 của tháng sau
      const dueDate = new Date(billingMonth);
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(5);
      
      // Xác định trạng thái hóa đơn
      let status = "Chưa thanh toán";
      let paidAt = null;
      let paymentMethod = null;
      
      // 30% hóa đơn đã thanh toán
      // 40% hóa đơn chưa thanh toán (sắp hết hạn)
      // 30% hóa đơn quá hạn
      const random = Math.random();
      
      if (random < 0.3) {
        // Đã thanh toán
        status = "Đã thanh toán";
        paidAt = new Date(billingMonth);
        paidAt.setDate(Math.floor(Math.random() * 4) + 1); // Thanh toán ngày 1-4
        paymentMethod = ["Tiền mặt", "Chuyển khoản", "Ví điện tử"][Math.floor(Math.random() * 3)];
      } else if (random < 0.7) {
        // Chưa thanh toán (sắp hết hạn)
        status = "Chưa thanh toán";
        // Điều chỉnh due_date để sắp hết hạn (còn 1-3 ngày)
        dueDate.setDate(now.getDate() + Math.floor(Math.random() * 3) + 1);
      } else {
        // Quá hạn
        status = "Quá hạn";
        // Điều chỉnh due_date đã qua (1-10 ngày trước)
        dueDate.setDate(now.getDate() - Math.floor(Math.random() * 10) - 1);
      }
      
      // Tính toán các khoản phí
      const rentAmount = parseFloat(room.rent_price);
      const garbageFee = parseFloat(room.garbage_fee) || 20000;
      const internetFee = parseFloat(room.internet_fee) || 50000;
      const parkingFee = parseFloat(room.parking_fee) || 30000;
      
      // Điện nước (ngẫu nhiên)
      const electricStart = Math.floor(Math.random() * 50) + 100; // 100-150
      const electricEnd = electricStart + Math.floor(Math.random() * 50) + 50; // +50-100 kWh
      const electricRate = 3500; // VNĐ/kWh
      const electricCost = (electricEnd - electricStart) * electricRate;
      
      const waterStart = Math.floor(Math.random() * 10) + 20; // 20-30
      const waterEnd = waterStart + Math.floor(Math.random() * 5) + 3; // +3-8 m³
      const waterRate = 15000; // VNĐ/m³
      const waterCost = (waterEnd - waterStart) * waterRate;
      
      // Phí khác (rác + mạng + gửi xe)
      const otherFees = garbageFee + internetFee + parkingFee;
      
      // Giảm giá (10% hóa đơn có giảm giá)
      const discountAmount = Math.random() < 0.1 ? Math.floor(Math.random() * 50000) + 50000 : 0;
      
      // Phí phạt (chỉ áp dụng cho hóa đơn quá hạn)
      const penaltyAmount = status === "Quá hạn" ? Math.floor(Math.random() * 100000) + 50000 : 0;
      
      // Tổng tiền
      const totalAmount = rentAmount + electricCost + waterCost + otherFees - discountAmount + penaltyAmount;
      
      // Tạo invoice ID theo format: invoice-timestamp-randomstring
      const randomStr = Math.random().toString(36).substring(2, 15);
      const invoiceId = `invoice-${timestamp - i * 1000}-${randomStr}`;
      const invoiceNumber = `HD-${billingMonth.getFullYear()}${(billingMonth.getMonth() + 1).toString().padStart(2, "0")}-${(10000 + i).toString()}`;
      
      const createdAt = new Date(billingMonth);
      createdAt.setDate(1);
      
      invoices.push({
        id: invoiceId,
        contract_id: room.contract_id,
        invoice_number: invoiceNumber,
        billing_month: billingMonth.toISOString().split("T")[0],
        rent_amount: rentAmount,
        electric_start: electricStart,
        electric_end: electricEnd,
        electric_rate: electricRate,
        water_start: waterStart,
        water_end: waterEnd,
        water_rate: waterRate,
        other_fees: otherFees,
        discount_amount: discountAmount,
        penalty_amount: penaltyAmount,
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
        `('${invoice.id}', '${invoice.contract_id}', '${invoice.invoice_number}', ` +
        `'${invoice.billing_month}', ${invoice.rent_amount}, ` +
        `${invoice.electric_start}, ${invoice.electric_end}, ${invoice.electric_rate}, ` +
        `${invoice.water_start}, ${invoice.water_end}, ${invoice.water_rate}, ` +
        `${invoice.other_fees}, ${invoice.discount_amount}, ${invoice.penalty_amount}, ` +
        `${invoice.total_amount}, '${invoice.status}', '${invoice.due_date}', ` +
        `${invoice.paid_at ? `'${invoice.paid_at}'` : "NULL"}, ` +
        `${invoice.payment_method ? `'${invoice.payment_method}'` : "NULL"}, ` +
        `${invoice.payment_reference ? `'${invoice.payment_reference}'` : "NULL"}, ` +
        `${invoice.note ? `'${invoice.note.replace(/'/g, "''")}'` : "NULL"}, ` +
        `'${invoice.created_by}', '${invoice.created_at}', '${invoice.updated_at}')`
      );

      const query = `
        INSERT INTO invoices (
          id, contract_id, invoice_number, billing_month, rent_amount,
          electric_start, electric_end, electric_rate,
          water_start, water_end, water_rate,
          other_fees, discount_amount, penalty_amount, total_amount,
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
    console.log(`📊 Tổng quan:`);
    console.log(`   - ${paidCount} hóa đơn đã thanh toán (30%)`);
    console.log(`   - ${unpaidCount} hóa đơn chưa thanh toán - sắp hết hạn (40%)`);
    console.log(`   - ${overdueCount} hóa đơn quá hạn (30%)`);
    console.log(`   - Tháng thanh toán: ${new Date().getMonth() + 1}/${new Date().getFullYear()}`);
    console.log(`   - Mỗi phòng có 1 hóa đơn (${rooms.length} phòng = ${invoices.length} hóa đơn)`);
    console.log(`   - Bao gồm: Tiền phòng + Điện + Nước + Phí dịch vụ`);
    
  } catch (error) {
    console.error("❌ Lỗi khi tạo fake data:", error);
  } finally {
    await pool.end();
  }
}

// Chạy script
generateFakeInvoices();
