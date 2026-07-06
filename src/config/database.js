const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// Khởi tạo connection pool cho PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "dormitory_system",
  max: 10,
  idleTimeoutMillis: 0, // 0 = giữ kết nối nhàn rỗi không đóng (tránh tắt tiến trình Node.js)
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: false, // Không để pg giải phóng hoàn toàn làm Node.js tự exit
  keepAlive: true, // Gửi TCP keepalive probes duy trì kết nối ổn định
  keepAliveInitialDelayMillis: 10000,
});

// Ngăn chặn lỗi đột ngột từ các idle clients làm crash ứng dụng
pool.on("error", (err) => {
  console.error("[pg pool] Lỗi kết nối PostgreSQL không mong muốn (đã bỏ qua):", err.message);
});

// Kiểm tra kết nối thử nghiệm tới database khi khởi chạy
pool
  .connect()
  .then((client) => {
    console.log("✅ Kết nối cơ sở dữ liệu PostgreSQL thành công!");
    client.release();
  })
  .catch((err) => {
    console.error("❌ Kết nối cơ sở dữ liệu thất bại:", err.message);
  });

module.exports = pool;
