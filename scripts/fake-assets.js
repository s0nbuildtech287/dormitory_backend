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
 * - Bóng đèn (giả sử 4 bóng/phòng)
 * 
 * Tài sản mỗi tầng:
 * - 1 camera (40 camera cho 40 tầng)
 * - 1 cục wifi (40 cục wifi cho 40 tầng)
 * 
 * Kho dự trữ: 10-30% tổng số tài sản đang sử dụng
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

    console.log(`📊 Tìm thấy ${rooms.length} phòng trong database`);

    const assets = [];
    let assetCounter = 1;

    // Định nghĩa các loại tài sản
    const assetCategories = [
      {
        name: "Giường đơn",
        code: "GD",
        unit: "Cái",
        perRoom: 5,
        perFloor: 0,
        price: 1500000,
        warranty: 24,
      },
      {
        name: "Tủ quần áo",
        code: "TU",
        unit: "Cái",
        perRoom: 5,
        perFloor: 0,
        price: 2000000,
        warranty: 24,
      },
      {
        name: "Bàn học",
        code: "BH",
        unit: "Cái",
        perRoom: 2,
        perFloor: 0,
        price: 800000,
        warranty: 12,
      },
      {
        name: "Quạt trần",
        code: "QT",
        unit: "Cái",
        perRoom: 2,
        perFloor: 0,
        price: 1200000,
        warranty: 12,
      },
      {
        name: "Điều hòa",
        code: "DH",
        unit: "Cái",
        perRoom: 1,
        perFloor: 0,
        price: 8000000,
        warranty: 36,
      },
      {
        name: "Bóng đèn LED",
        code: "DL",
        unit: "Cái",
        perRoom: 4,
        perFloor: 0,
        price: 150000,
        warranty: 6,
      },
      {
        name: "Camera an ninh",
        code: "CM",
        unit: "Cái",
        perRoom: 0,
        perFloor: 1,
        price: 3000000,
        warranty: 24,
      },
      {
        name: "Bộ phát Wifi",
        code: "WF",
        unit: "Cái",
        perRoom: 0,
        perFloor: 1,
        price: 1500000,
        warranty: 12,
      },
    ];

    // Tính tổng số tài sản cần cho tất cả phòng
    const totalAssetsByCategory = {};
    assetCategories.forEach((cat) => {
      const roomAssets = cat.perRoom * rooms.length;
      const floorAssets = cat.perFloor * 40; // 4 tòa × 10 tầng = 40 tầng
      totalAssetsByCategory[cat.code] = roomAssets + floorAssets;
    });

    console.log("\n📦 Tổng số tài sản cần thiết:");
    assetCategories.forEach((cat) => {
      console.log(`   - ${cat.name}: ${totalAssetsByCategory[cat.code]} ${cat.unit}`);
    });

    // ========================================
    // BƯỚC 1: Tạo tài sản cho từng phòng
    // ========================================
    console.log("\n🏠 Đang tạo tài sản cho các phòng...");

    for (const room of rooms) {
      for (const category of assetCategories) {
        if (category.perRoom > 0) {
          const assetCode = `${category.code}${assetCounter.toString().padStart(4, "0")}`;
          const purchaseDate = new Date(2023, Math.floor(Math.random() * 12), 1);
          const warrantyExpiry = new Date(purchaseDate);
          warrantyExpiry.setMonth(warrantyExpiry.getMonth() + category.warranty);

          const asset = {
            id: `asset-${assetCounter.toString().padStart(5, "0")}`,
            asset_code: assetCode,
            name: category.name,
            category_name: getCategoryName(category.code),
            category_code: category.code,
            unit: category.unit,
            room_id: room.id,
            location: `Phòng ${room.room_number}`,
            quantity: category.perRoom,
            status: "Đang sử dụng",
            condition: getRandomCondition(),
            purchase_date: purchaseDate.toISOString().split("T")[0],
            purchase_price: category.price,
            current_value: calculateCurrentValue(category.price, purchaseDate),
            depreciation_rate: 10.0,
            supplier: getRandomSupplier(),
            warranty_period: category.warranty,
            warranty_expiry: warrantyExpiry.toISOString().split("T")[0],
            specifications: JSON.stringify(getSpecifications(category.name)),
            qr_code: `QR_${assetCode}`,
            description: `${category.name} tại ${room.room_number}`,
            note: null,
            created_by: "admin-1",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          assets.push(asset);
          assetCounter++;
        }
      }
    }

    // ========================================
    // BƯỚC 2: Tạo tài sản cho từng tầng (Camera, Wifi)
    // ========================================
    console.log("🏢 Đang tạo tài sản cho các tầng (Camera, Wifi)...");

    const buildings = ["A", "B", "C", "D"];
    const floors = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    for (const building of buildings) {
      for (const floor of floors) {
        // Lấy phòng đầu tiên của tầng để gán tài sản
        const firstRoomOnFloor = rooms.find(
          (r) => r.building === building && r.floor === floor
        );

        if (!firstRoomOnFloor) continue;

        for (const category of assetCategories) {
          if (category.perFloor > 0) {
            const assetCode = `${category.code}${assetCounter.toString().padStart(4, "0")}`;
            const purchaseDate = new Date(2023, Math.floor(Math.random() * 12), 1);
            const warrantyExpiry = new Date(purchaseDate);
            warrantyExpiry.setMonth(warrantyExpiry.getMonth() + category.warranty);

            const asset = {
              id: `asset-${assetCounter.toString().padStart(5, "0")}`,
              asset_code: assetCode,
              name: category.name,
              category_name: getCategoryName(category.code),
              category_code: category.code,
              unit: category.unit,
              room_id: firstRoomOnFloor.id, // Gán vào phòng đầu tầng
              location: `Tầng ${floor} - Tòa ${building}`,
              quantity: category.perFloor,
              status: "Đang sử dụng",
              condition: getRandomCondition(),
              purchase_date: purchaseDate.toISOString().split("T")[0],
              purchase_price: category.price,
              current_value: calculateCurrentValue(category.price, purchaseDate),
              depreciation_rate: 10.0,
              supplier: getRandomSupplier(),
              warranty_period: category.warranty,
              warranty_expiry: warrantyExpiry.toISOString().split("T")[0],
              specifications: JSON.stringify(getSpecifications(category.name)),
              qr_code: `QR_${assetCode}`,
              description: `${category.name} tại tầng ${floor} tòa ${building}`,
              note: null,
              created_by: "admin-1",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            assets.push(asset);
            assetCounter++;
          }
        }
      }
    }

    // ========================================
    // BƯỚC 3: Tạo tài sản dự trữ trong kho (10-30%)
    // ========================================
    console.log("📦 Đang tạo tài sản dự trữ trong kho...");

    for (const category of assetCategories) {
      const totalInUse = totalAssetsByCategory[category.code];
      const reservePercent = 0.1 + Math.random() * 0.2; // 10-30%
      const reserveQuantity = Math.ceil(totalInUse * reservePercent);

      const assetCode = `${category.code}${assetCounter.toString().padStart(4, "0")}`;
      const purchaseDate = new Date(2024, 0, 1);
      const warrantyExpiry = new Date(purchaseDate);
      warrantyExpiry.setMonth(warrantyExpiry.getMonth() + category.warranty);

      const asset = {
        id: `asset-${assetCounter.toString().padStart(5, "0")}`,
        asset_code: assetCode,
        name: category.name,
        category_name: getCategoryName(category.code),
        category_code: category.code,
        unit: category.unit,
        room_id: null, // NULL = trong kho
        location: "Kho tổng",
        quantity: reserveQuantity,
        status: "Sẵn sàng",
        condition: "Mới",
        purchase_date: purchaseDate.toISOString().split("T")[0],
        purchase_price: category.price,
        current_value: category.price,
        depreciation_rate: 10.0,
        supplier: getRandomSupplier(),
        warranty_period: category.warranty,
        warranty_expiry: warrantyExpiry.toISOString().split("T")[0],
        specifications: JSON.stringify(getSpecifications(category.name)),
        qr_code: `QR_${assetCode}`,
        description: `${category.name} dự trữ trong kho`,
        note: "Tài sản dự trữ",
        created_by: "admin-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      assets.push(asset);
      assetCounter++;

      console.log(
        `   - ${category.name}: ${reserveQuantity} ${category.unit} (${(reservePercent * 100).toFixed(1)}%)`
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
          '${asset.category_code}',
          '${asset.unit}',
          ${roomId},
          '${asset.location}',
          ${asset.quantity},
          '${asset.status}',
          '${asset.condition}',
          '${asset.purchase_date}',
          ${asset.purchase_price},
          ${asset.current_value},
          ${asset.depreciation_rate},
          '${asset.supplier}',
          ${asset.warranty_period},
          '${asset.warranty_expiry}',
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
          id, asset_code, name, category_name, category_code, unit,
          room_id, location, quantity, status, condition,
          purchase_date, purchase_price, current_value, depreciation_rate,
          supplier, warranty_period, warranty_expiry, specifications,
          qr_code, description, note, created_by, created_at, updated_at
        ) VALUES ${values.join(", ")}
        ON CONFLICT (asset_code) DO NOTHING;
      `;

      await pool.query(query);
      console.log(`   ✓ Đã lưu batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(assets.length / batchSize)}`);
    }

    // ========================================
    // BƯỚC 5: Thống kê
    // ========================================
    console.log("\n✅ Hoàn thành tạo fake data cho assets!");
    console.log(`\n📊 Thống kê:`);
    console.log(`   - Tổng số tài sản: ${assets.length}`);
    console.log(`   - Tài sản đang sử dụng: ${assets.filter((a) => a.status === "Đang sử dụng").length}`);
    console.log(`   - Tài sản trong kho: ${assets.filter((a) => a.status === "Sẵn sàng").length}`);

    console.log(`\n📦 Chi tiết theo loại:`);
    for (const category of assetCategories) {
      const categoryAssets = assets.filter((a) => a.category_code === category.code);
      const inUse = categoryAssets.filter((a) => a.status === "Đang sử dụng");
      const inStock = categoryAssets.filter((a) => a.status === "Sẵn sàng");
      const totalQty = categoryAssets.reduce((sum, a) => sum + a.quantity, 0);

      console.log(`   - ${category.name}:`);
      console.log(`     • Tổng: ${totalQty} ${category.unit}`);
      console.log(`     • Đang dùng: ${inUse.reduce((sum, a) => sum + a.quantity, 0)} ${category.unit}`);
      console.log(`     • Trong kho: ${inStock.reduce((sum, a) => sum + a.quantity, 0)} ${category.unit}`);
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

function getCategoryName(code) {
  const categoryMap = {
    GD: "Nội thất",
    TU: "Nội thất",
    BH: "Nội thất",
    QT: "Thiết bị điện",
    DH: "Thiết bị điện",
    DL: "Thiết bị điện",
    CM: "Thiết bị an ninh",
    WF: "Thiết bị mạng",
  };
  return categoryMap[code] || "Khác";
}

function getRandomCondition() {
  const conditions = ["Mới", "Tốt", "Tốt", "Khá", "Khá"];
  return conditions[Math.floor(Math.random() * conditions.length)];
}

function calculateCurrentValue(purchasePrice, purchaseDate) {
  const monthsOld = Math.floor(
    (new Date() - new Date(purchaseDate)) / (1000 * 60 * 60 * 24 * 30)
  );
  const depreciationRate = 0.1 / 12; // 10% per year = 0.833% per month
  const currentValue = purchasePrice * Math.pow(1 - depreciationRate, monthsOld);
  return Math.max(currentValue, purchasePrice * 0.2); // Minimum 20% of original value
}

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
