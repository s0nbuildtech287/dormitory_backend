const express = require("express");
const cors = require("cors");

// ──────────────────────────────────────────────────────────
// Global error guards (must be first – before any require)
// Node ≥ 15 exits on unhandledRejection by default; catch it
// ──────────────────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException] Server will NOT exit:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection] Server will NOT exit:", reason instanceof Error ? reason.message : reason);
});

// Log WHY the process is exiting (diagnostic)
process.on("exit", (code) => {
  console.error(`[exit] Process exiting with code ${code}`);
});

// Graceful shutdown on SIGTERM / SIGINT (Ctrl+C) – keeps the event loop alive
process.on("SIGTERM", () => {
  console.log("[SIGTERM] Received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[SIGINT] Received (Ctrl+C), shutting down...");
  process.exit(0);
});

// Temporarily disable console.log to hide dotenv messages
const originalConsoleLog = console.log;
console.log = () => { }; // Disable logging temporarily
require("dotenv").config();
console.log = originalConsoleLog; // Restore logging

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use("/uploads", express.static("uploads"));

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Dormitory System Backend!" });
});

// API Routes
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

// 404 handler (must come after all routes)
const { errorHandler, notFound } = require("./middlewares/errorHandler");
app.use(notFound);

// Central error handler (must be last middleware, 4 params)
app.use(errorHandler);

const PORT = process.env.PORT || 1234;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Khởi động các tác vụ định kỳ
  const { startOverdueScheduler } = require('./untils/scheduler');
  startOverdueScheduler();
});
