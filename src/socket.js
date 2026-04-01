/**
 * socket.js — WebSocket server dùng socket.io
 *
 * Rooms:
 *   "admins"          — tất cả admin đang online
 *   "students"        — tất cả sinh viên đang online
 *   "user:<userId>"   — 1 user cụ thể
 *
 * Events server → client:
 *   "notification"    — { id, title, content, type, target_audience, created_at }
 *   "admin_alert"     — { type: "new_registration"|"new_feedback", data: {...} }
 *
 * Events client → server:
 *   "join"            — { userId, role } — client tự join room khi connect
 */

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

/**
 * Khởi tạo socket.io gắn vào HTTP server
 */
function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    io.use((socket, next) => {
        // Xác thực JWT từ handshake auth
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("No token"));
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded; // { userId, role, email, ... }
            next();
        } catch {
            next(new Error("Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        const { userId, role } = socket.user;

        // Join room theo role và userId
        socket.join(`user:${userId}`);
        if (role === "ADMIN") {
            socket.join("admins");
        } else {
            socket.join("students");
        }

        console.log(`[WS] Connected: ${userId} (${role})`);

        socket.on("disconnect", () => {
            console.log(`[WS] Disconnected: ${userId}`);
        });
    });

    return io;
}

/**
 * Lấy instance io (dùng trong services)
 */
function getIO() {
    if (!io) throw new Error("Socket.io chưa được khởi tạo");
    return io;
}

/**
 * Gửi thông báo đến đúng đối tượng
 * @param {Object} notification - Notification object từ DB
 */
function emitNotification(notification) {
    if (!io) return;
    const payload = {
        id:               notification.id,
        title:            notification.title,
        content:          notification.content,
        type:             notification.type,
        target_audience:  notification.target_audience,
        created_at:       notification.created_at || new Date().toISOString(),
    };

    if (notification.target_audience === "ALL") {
        io.emit("notification", payload);
    } else if (notification.target_audience === "STUDENTS") {
        io.to("students").emit("notification", payload);
    } else if (notification.target_audience === "SPECIFIC") {
        // target_users là JSON array of userIds
        let userIds = notification.target_users;
        if (typeof userIds === "string") {
            try { userIds = JSON.parse(userIds); } catch { userIds = []; }
        }
        if (Array.isArray(userIds)) {
            userIds.forEach((uid) => {
                io.to(`user:${uid}`).emit("notification", payload);
            });
        }
    }
}

/**
 * Gửi alert đến tất cả admin (hồ sơ mới, phản ánh mới)
 * @param {"new_registration"|"new_feedback"} type
 * @param {Object} data
 */
function emitAdminAlert(type, data) {
    if (!io) return;
    io.to("admins").emit("admin_alert", { type, data, timestamp: new Date().toISOString() });
}

module.exports = { initSocket, getIO, emitNotification, emitAdminAlert };
