const pool = require("../src/config/database");

/**
 * Script tạo fake data cho bảng assets (Tài sản)
 * 
 * Cấu trúc KTX:
 * - 4 tòa nhà: A, B, C, D
 * - Mỗi tòa: 10 tầng
 * - Mỗi tầng: 10 phòng
 * - Tổng: 400 phòng
 * 
 * Tài sản mỗi phòng:
 * - 5 giường
 * - 5 tủ quần áo
 * - 2 bàn học
 * - 2 quạt trần
 * - 1 điều hòa
 * - 4 bóng đèn
 * 
 * Tài sản mỗi tầng:
 * - 1 camera (40 camera cho 40 tầng)
 * - 1 cục wifi (40 cục wifi cho 40 tầng)
 * 
 * Kho dự trữ: 10-30% tổng số tài sản đang sử dụng
 * 
 * Đơn giản hóa:
 * - Mỗi loại tài sản dùng chung 1 asset_code
 * - Bỏ: category_code, condition, current_value, depreciation_rate, warranty_period, warranty_expiry
 * - Mỗi loại có giá mua cố định
 */

async function generateFakeAssets() {
  try {
    console.log("🚀 Bắt đầu tạo fake data cho bảng assets...");

    // Lấy danh sách phòng từ database
    const roomsResult = await pool.query(`
      SELECT id, room_number, building, floor 
      FROM rooms 
      ORDER BY building, floor, room_number
    `);
    const rooms = roomsResult.rows;
    const floorKeys = new Set(rooms.map((room) => `${room.building}::${room.floor}`));
    const totalFloors = floorKeys.size;

    console.log(`📊 Tìm thấy ${rooms.length} phòng trong database`);

    const assets = [];
    let recordCounter = 1;

    // Định nghĩa các loại tài sản với thông tin đơn giản
    const assetTypes = [
      {
        asset_code: "GIUONG",
        name: "Giường đơn",
        category_name: "Nội thất",
        unit: "Cái",
        perRoom: 5,
        perFloor: 0,
        price: 1500000,
        purchase_date: "2023-01-15",
      },
      {
        asset_code: "TU",
        name: "Tủ quần áo",
        category_name: "Nội thất",
        unit: "Cái",
        perRoom: 5,
        perFloor: 0,
        price: 2000000,
        purchase_date: "2023-01-15",
      },
      {
        asset_code: "BAN",
        name: "Bàn học",
        category_name: "Nội thất",
        unit: "Cái",
        perRoom: 2,
        perFloor: 0,
        price: 800000,
        purchase_date: "2023-02-10",
      },
      {
        asset_code: "QUAT",
        name: "Quạt trần",
        category_name: "Thiết bị điện",
        unit: "Cái",
        perRoom: 2,
        perFloor: 0,
        price: 1200000,
        purchase_date: "2023-03-05",
      },
      {
        asset_code: "DIEUHOA",
        name: "Điều hòa",
        category_name: "Thiết bị điện",
        unit: "Cái",
        perRoom: 1,
        perFloor: 0,
        price: 8000000,
        purchase_date: "2023-03-20",
      },
      {
        asset_code: "DEN",
        name: "Bóng đèn LED",
        category_name: "Thiết bị điện",
        unit: "Cái",
        perRoom: 4,
        perFloor: 0,
        price: 150000,
        purchase_date: "2023-04-01",
      },
      {
        asset_code: "CAMERA",
        name: "Camera an ninh",
        category_name: "Thiết bị an ninh",
        unit: "Cái",
        perRoom: 0,
        perFloor: 1,
        price: 3000000,
        purchase_date: "2023-05-10",
      },
      {
        asset_code: "WIFI",
        name: "Bộ phát Wifi",
        category_name: "Thiết bị mạng",
        unit: "Cái",
        perRoom: 0,
        perFloor: 1,
        price: 1500000,
        purchase_date: "2023-05-15",
      },
    ];

    // Tính tổng số tài sản cần cho tất cả phòng
    const totalAssetsByType = {};
    assetTypes.forEach((type) => {
      const roomAssets = type.perRoom * rooms.length;
      const floorAssets = type.perFloor * totalFloors;
      totalAssetsByType[type.asset_code] = roomAssets + floorAssets;
    });

    console.log("\n📦 Tổng số tài sản cần thiết:");
    assetTypes.forEach((type) => {
      console.log(`   - ${type.name}: ${totalAssetsByType[type.asset_code]} ${type.unit}`);
    });

    // ========================================
    // BƯỚC 1: Tạo tài sản cho từng phòng
    // ========================================
    console.log("\n🏠 Đang tạo tài sản cho các phòng...");

    for (const room of rooms) {
      for (const type of assetTypes) {
        if (type.perRoom > 0) {
          const asset = {
            id: `asset-${recordCounter.toString().padStart(5, "0")}`,
            asset_code: type.asset_code,
            name: type.name,
            category_name: type.category_name,
            unit: type.unit,
            room_id: room.id,
            location: `Phòng ${room.room_number}`,
            quantity: type.perRoom,
            status: "Đang sử dụng",
            purchase_date: type.purchase_date,
            purchase_price: type.price,
            supplier: getRandomSupplier(),
            specifications: JSON.stringify(getSpecifications(type.name)),
            qr_code: `QR_${type.asset_code}_${room.room_number}`,
            description: `${type.name} tại ${room.room_number}`,
            note: null,
            created_by: "admin-1",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          assets.push(asset);
          recordCounter++;
        }
      }
    }

    // ========================================
    // BƯỚC 2: Tạo tài sản cho từng tầng (Camera, Wifi)
    // ========================================
    console.log("🏢 Đang tạo tài sản cho các tầng (Camera, Wifi)...");

    const buildingFloors = rooms.reduce((acc, room) => {
      if (!acc[room.building]) acc[room.building] = new Set();
      acc[room.building].add(room.floor);
      return acc;
    }, {});

    for (const [building, floors] of Object.entries(buildingFloors)) {
      for (const floor of [...floors].sort((a, b) => a - b)) {
        // Lấy phòng đầu tiên của tầng để gán tài sản
        const firstRoomOnFloor = rooms.find(
          (r) => r.building === building && r.floor === floor
        );

        if (!firstRoomOnFloor) continue;

        for (const type of assetTypes) {
          if (type.perFloor > 0) {
            const asset = {
              id: `asset-${recordCounter.toString().padStart(5, "0")}`,
              asset_code: type.asset_code,
              name: type.name,
              category_name: type.category_name,
              unit: type.unit,
              room_id: firstRoomOnFloor.id,
              location: `Tầng ${floor} - Tòa ${building}`,
              quantity: type.perFloor,
              status: "Đang sử dụng",
              purchase_date: type.purchase_date,
              purchase_price: type.price,
              supplier: getRandomSupplier(),
              specifications: JSON.stringify(getSpecifications(type.name)),
              qr_code: `QR_${type.asset_code}_${building}${floor}`,
              description: `${type.name} tại tầng ${floor} tòa ${building}`,
              note: null,
              created_by: "admin-1",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            assets.push(asset);
            recordCounter++;
          }
        }
      }
    }

    // ========================================
    // BƯỚC 3: Tạo tài sản dự trữ trong kho (10-30%)
    // ========================================
    console.log("📦 Đang tạo tài sản dự trữ trong kho...");

    for (const type of assetTypes) {
      const totalInUse = totalAssetsByType[type.asset_code];
      const reservePercent = 0.1 + Math.random() * 0.2; // 10-30%
      const reserveQuantity = Math.ceil(totalInUse * reservePercent);

      const asset = {
        id: `asset-${recordCounter.toString().padStart(5, "0")}`,
        asset_code: type.asset_code,
        name: type.name,
        category_name: type.category_name,
        unit: type.unit,
        room_id: null, // NULL = trong kho
        location: "Kho tổng",
        quantity: reserveQuantity,
        status: "Sẵn sàng",
        purchase_date: type.purchase_date,
        purchase_price: type.price,
        supplier: getRandomSupplier(),
        specifications: JSON.stringify(getSpecifications(type.name)),
        qr_code: `QR_${type.asset_code}_KHO`,
        description: `${type.name} dự trữ trong kho`,
        note: "Tài sản dự trữ",
        created_by: "admin-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      assets.push(asset);
      recordCounter++;

      console.log(
        `   - ${type.name}: ${reserveQuantity} ${type.unit} (${(reservePercent * 100).toFixed(1)}%)`
      );
    }

    // ========================================
    // BƯỚC 4: Insert vào database
    // ========================================
    console.log("\n💾 Đang lưu vào database...");

    // Chia nhỏ thành các batch để tránh query quá dài
    const batchSize = 100;
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      const values = batch.map((asset) => {
        const roomId = asset.room_id ? `'${asset.room_id}'` : "NULL";
        const note = asset.note ? `'${asset.note}'` : "NULL";

        return `(
          '${asset.id}',
          '${asset.asset_code}',
          '${asset.name}',
          '${asset.category_name}',
          '${asset.unit}',
          ${roomId},
          '${asset.location}',
          ${asset.quantity},
          '${asset.status}',
          '${asset.purchase_date}',
          ${asset.purchase_price},
          '${asset.supplier}',
          '${asset.specifications}',
          '${asset.qr_code}',
          '${asset.description}',
          ${note},
          '${asset.created_by}',
          '${asset.created_at}',
          '${asset.updated_at}'
        )`;
      });

      const query = `
        INSERT INTO assets (
          id, asset_code, name, category_name, unit,
          room_id, location, quantity, status,
          purchase_date, purchase_price,
          supplier, specifications,
          qr_code, description, note, created_by, created_at, updated_at
        ) VALUES ${values.join(", ")}
        ON CONFLICT (id) DO NOTHING;
      `;

      await pool.query(query);
      console.log(`   ✓ Đã lưu batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(assets.length / batchSize)}`);
    }

    // ========================================
    // BƯỚC 5: Thống kê
    // ========================================
    console.log("\n✅ Hoàn thành tạo fake data cho assets!");
    console.log(`\n📊 Thống kê:`);
    console.log(`   - Tổng số bản ghi: ${assets.length}`);
    console.log(`   - Tài sản đang sử dụng: ${assets.filter((a) => a.status === "Đang sử dụng").length}`);
    console.log(`   - Tài sản trong kho: ${assets.filter((a) => a.status === "Sẵn sàng").length}`);

    console.log(`\n📦 Chi tiết theo loại:`);
    for (const type of assetTypes) {
      const typeAssets = assets.filter((a) => a.asset_code === type.asset_code);
      const inUse = typeAssets.filter((a) => a.status === "Đang sử dụng");
      const inStock = typeAssets.filter((a) => a.status === "Sẵn sàng");
      const totalQty = typeAssets.reduce((sum, a) => sum + a.quantity, 0);

      console.log(`   - ${type.name}:`);
      console.log(`     • Tổng: ${totalQty} ${type.unit}`);
      console.log(`     • Đang dùng: ${inUse.reduce((sum, a) => sum + a.quantity, 0)} ${type.unit}`);
      console.log(`     • Trong kho: ${inStock.reduce((sum, a) => sum + a.quantity, 0)} ${type.unit}`);
    }
  } catch (error) {
    console.error("❌ Lỗi khi tạo fake data:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getRandomSupplier() {
  const suppliers = [
    "Công ty TNHH Nội thất Hòa Phát",
    "Công ty CP Thiết bị điện Việt Nam",
    "Công ty TNHH Điện máy Xanh",
    "Công ty CP Thế Giới Di Động",
    "Công ty TNHH An Phát",
  ];
  return suppliers[Math.floor(Math.random() * suppliers.length)];
}

function getSpecifications(assetName) {
  const specs = {
    "Giường đơn": {
      "Kích thước": "2m x 0.9m",
      "Chất liệu": "Gỗ công nghiệp",
      "Màu sắc": "Nâu vân gỗ",
    },
    "Tủ quần áo": {
      "Kích thước": "1.8m x 0.8m x 0.5m",
      "Chất liệu": "Gỗ công nghiệp",
      "Số ngăn": "3 ngăn",
    },
    "Bàn học": {
      "Kích thước": "1.2m x 0.6m",
      "Chất liệu": "Gỗ công nghiệp",
      "Có ngăn kéo": "2 ngăn",
    },
    "Quạt trần": {
      "Công suất": "75W",
      "Đường kính cánh": "1.2m",
      "Tốc độ": "3 cấp độ",
    },
    "Điều hòa": {
      "Công suất": "12000 BTU",
      "Loại": "Inverter",
      "Hãng": "Daikin/Panasonic",
      "Tiết kiệm điện": "5 sao",
    },
    "Bóng đèn LED": {
      "Công suất": "12W",
      "Độ sáng": "1200 lumen",
      "Nhiệt độ màu": "6500K (ánh sáng trắng)",
    },
    "Camera an ninh": {
      "Độ phân giải": "2MP Full HD",
      "Góc nhìn": "110 độ",
      "Hồng ngoại": "Có (20m)",
      "Kết nối": "IP/Wifi",
    },
    "Bộ phát Wifi": {
      "Chuẩn": "802.11ac",
      "Tốc độ": "1200Mbps",
      "Băng tần": "Dual-band 2.4GHz/5GHz",
      "Số thiết bị": "50+ thiết bị",
    },
  };
  return specs[assetName] || { "Thông tin": "Đang cập nhật" };
}

// Chạy script
generateFakeAssets();
