const pool = require("../src/config/database");

async function generateFakeRooms() {
  try {
    console.log("🚀 Bắt đầu tạo fake data cho bảng rooms...");

    const buildings = ["A", "B", "C", "D"];
    const floors = [1, 2, 3, 4, 5];
    const roomsPerFloor = 10; // 10 phòng/tầng
    const totalRooms = buildings.length * floors.length * roomsPerFloor; // 200 phòng

    const rooms = [];

    let roomCounter = 1;

    for (const building of buildings) {
      // Xác định gender cho tòa: A và C Nam, B và D Nữ
      const gender = building === "A" || building === "C" ? "Nam" : "Nữ";

      for (const floor of floors) {
        for (let roomNum = 1; roomNum <= roomsPerFloor; roomNum++) {
          const roomNumber = `${building}${floor}${roomNum.toString().padStart(2, "0")}`; // A101, A102, etc.
          const id = `room-${roomCounter.toString().padStart(3, "0")}`;

          const room = {
            id,
            room_number: roomNumber,
            building,
            floor,
            capacity: 5,
            current_occupancy: 0,
            gender_type: gender,
            rent_price: 500000.0, // 500,000 VNĐ
            garbage_fee: 20000.0, // 20,000 VNĐ
            internet_fee: 50000.0, // 50,000 VNĐ
            parking_fee: 30000.0, // 30,000 VNĐ
            status: "Active",
            area: 25.0, // 25 m²
            qr_code: `QR_${roomNumber}`, // Fake QR code
            equipment: JSON.stringify(["Giường đơn", "Tủ quần áo", "Bàn học", "Ghế", "Quạt máy"]),
            electric_meter_reading: 0.0,
            water_meter_reading: 0.0,
            last_inspection_date: new Date(2024, 0, 1).toISOString().split("T")[0], // 2024-01-01
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          rooms.push(room);
          roomCounter++;
        }
      }
    }

    // Insert vào database
    const values = rooms.map(
      (room) =>
        `('${room.id}', '${room.room_number}', '${room.building}', ${room.floor}, ${room.capacity}, ${room.current_occupancy}, '${room.gender_type}', ${room.rent_price}, ${room.garbage_fee}, ${room.internet_fee}, ${room.parking_fee}, '${room.status}', ${room.area}, '${room.qr_code}', '${room.equipment}', ${room.electric_meter_reading}, ${room.water_meter_reading}, '${room.last_inspection_date}', '${room.created_at}', '${room.updated_at}')`,
    );

    const query = `
      INSERT INTO rooms (id, room_number, building, floor, capacity, current_occupancy, gender_type, rent_price, garbage_fee, internet_fee, parking_fee, status, area, qr_code, equipment, electric_meter_reading, water_meter_reading, last_inspection_date, created_at, updated_at)
            VALUES ${values.join(", ")}
            ON CONFLICT (room_number) DO NOTHING;
        `;

    await pool.query(query);

    console.log(`✅ Đã tạo thành công ${rooms.length} phòng fake data!`);
    console.log(`📊 Tổng quan:`);
    console.log(`   - 4 tòa nhà: A, B, C, D`);
    console.log(`   - Mỗi tòa: 5 tầng × 10 phòng = 50 phòng`);
    console.log(`   - Tổng: 200 phòng`);
    console.log(`   - Mỗi phòng: 5 chỗ, giá 500,000 VNĐ/tháng`);
    console.log(`   - Phí dịch vụ: Rác 20,000 VNĐ, Mạng 50,000 VNĐ, Gửi xe 30,000 VNĐ/tháng`);
  } catch (error) {
    console.error("❌ Lỗi khi tạo fake data:", error);
  } finally {
    await pool.end();
  }
}

// Chạy script
generateFakeRooms();
