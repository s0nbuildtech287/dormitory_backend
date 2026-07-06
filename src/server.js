const express = require("express");
const cors = require("cors");
const path = require("path");

// ──────────────────────────────────────────────────────────
// Cơ chế bắt lỗi toàn cục (phải đặt ở đầu tiên - trước mọi require)
// Bắt các ngoại lệ chưa được xử lý để tránh crash server
// ──────────────────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException] Server will NOT exit:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection] Server will NOT exit:", reason instanceof Error ? reason.message : reason);
});

// Ghi nhật ký lý do tiến trình bị tắt (chẩn đoán)
process.on("exit", (code) => {
  console.error(`[exit] Process exiting with code ${code}`);
});

// Tắt tiến trình an toàn khi nhận tín hiệu SIGTERM / SIGINT (Ctrl+C)
process.on("SIGTERM", () => {
  console.log("[SIGTERM] Received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[SIGINT] Received (Ctrl+C), shutting down...");
  process.exit(0);
});

// Ẩn tạm thời console.log để tránh hiển thị các thông báo từ dotenv
const originalConsoleLog = console.log;
console.log = () => { }; // Tắt ghi log tạm thời
require("dotenv").config();
console.log = originalConsoleLog; // Restore logging

const app = express();

// Trust proxy để lấy IP thật từ X-Forwarded-For header
app.set('trust proxy', true);
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cung cấp các file tĩnh từ thư mục uploads và dist (frontend)
app.use("/uploads", express.static("uploads"));
app.use(express.static(path.join(__dirname, "../dist")));

// Định nghĩa các tuyến đường (Routes)
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Dormitory System Backend!" });
});

// Các tuyến API chính của hệ thống
const authRoutes = require("./routers/authRoutes");
const registrationRoutes = require("./routers/registrationRoutes");
const roomRoutes = require("./routers/roomRoutes");
const contractRoutes = require("./routers/contractRoutes");
const invoiceRoutes = require("./routers/invoiceRoutes");
const feedbackRoutes = require("./routers/feedbackRoutes");
const notificationRoutes = require("./routers/notificationRoutes");
const logRoutes = require("./routers/logRoutes");
const assetRoutes = require("./routers/assetRoutes");
const disciplinaryRoutes = require("./routers/disciplinaryRoutes");
// Routes dành riêng cho sinh viên (profile, contracts, invoices, notifications, feedbacks, disciplinary)
const studentRoutes = require("./routers/studentRoutes");
const emailRoutes = require("./routers/emailRoutes");
const vnpayRoutes = require("./routers/vnpayRoutes");
const aiRoutes = require("./routers/aiRoutes");
const newsRoutes = require("./routers/newsRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/feedbacks", feedbackRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/disciplinary", disciplinaryRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/vnpay", vnpayRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/news", newsRoutes);

app.get(/^\/(?!api|uploads).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// Bộ xử lý lỗi 404 Not Found (đặt sau tất cả các route)
const { errorHandler, notFound } = require("./middlewares/errorHandler");
app.use(notFound);

// Middleware xử lý lỗi tập trung (phải là middleware cuối cùng, có 4 tham số)
app.use(errorHandler);

const PORT = process.env.PORT || 1234;

const http = require("http");
const { initSocket } = require("./socket.js");
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Khởi động các tác vụ định kỳ
  const { startOverdueScheduler } = require('./untils/scheduler');
  startOverdueScheduler();
});
