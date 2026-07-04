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
        if (role === "ADMIN" || role === "SUPER_ADMIN" || role === "STAFF") {
            socket.join("admins");
        } else {
            socket.join("students");
        }

        const adminRoom = io.sockets.adapter.rooms.get("admins");
        const studentRoom = io.sockets.adapter.rooms.get("students");
        const adminCount = adminRoom ? adminRoom.size : 0;
        const studentCount = studentRoom ? studentRoom.size : 0;
        console.log(`[WS] Connected: ${userId} (${role}) | online: ${adminCount} admin, ${studentCount} student`);

        socket.on("disconnect", () => {
            console.log(`[WS] Disconnected: ${userId} (${role})`);
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
    const fs = require('fs');
    try {
        fs.appendFileSync('socket_debug.log', `[WS Debug] emitNotification entry: ${JSON.stringify(notification)}\n`);
    } catch (e) {}

    if (!io) {
        try { fs.appendFileSync('socket_debug.log', `[WS Debug] IO is NULL, return\n`); } catch (e) {}
        return;
    }
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
        try { fs.appendFileSync('socket_debug.log', `[WS Debug] Emitted to ALL\n`); } catch (e) {}
    } else if (notification.target_audience === "STUDENTS") {
        io.to("students").emit("notification", payload);
        try { fs.appendFileSync('socket_debug.log', `[WS Debug] Emitted to students room\n`); } catch (e) {}
    } else if (notification.target_audience === "SPECIFIC") {
        // target_users là JSON array of userIds
        let userIds = notification.target_users;
        try { fs.appendFileSync('socket_debug.log', `[WS Debug] target_users type: ${typeof userIds}, value: ${JSON.stringify(userIds)}\n`); } catch (e) {}
        if (typeof userIds === "string") {
            try { userIds = JSON.parse(userIds); } catch { userIds = []; }
        }
        if (Array.isArray(userIds)) {
            userIds.forEach((uid) => {
                const roomName = `user:${uid}`;
                const clientsInRoom = io.sockets.adapter.rooms.get(roomName);
                const count = clientsInRoom ? clientsInRoom.size : 0;
                try { fs.appendFileSync('socket_debug.log', `[WS Debug] Emitting to room ${roomName} (active clients: ${count})\n`); } catch (e) {}
                io.to(roomName).emit("notification", payload);
            });
        } else {
            try { fs.appendFileSync('socket_debug.log', `[WS Debug] target_users is not an array!\n`); } catch (e) {}
        }
    }
}

/**
 * Gửi alert đến tất cả admin (hồ sơ mới, phản ánh mới)
 * @param {"new_registration"|"new_feedback"} type
 * @param {Object} data
 */
function emitAdminAlert(type, data) {
    if (!io) {
        console.warn('[WS] emitAdminAlert: io chưa khởi tạo, bỏ qua emit');
        return;
    }
    const adminRoom = io.sockets.adapter.rooms.get('admins');
    console.log(`[WS] emitAdminAlert type=${type} | admins online: ${adminRoom ? adminRoom.size : 0}`);
    io.to("admins").emit("admin_alert", { type, data, timestamp: new Date().toISOString() });
}

/**
 * Gửi cảnh báo phản ánh nghiêm trọng đến tất cả admin đang online
 * Emit khi priority = 'High' hoặc (sentiment = 'Negative' && sentiment_score >= 0.8)
 * @param {Object} payload - { feedbackId, summary, sentiment, priority, emotion }
 */
function emitHighPriorityAlert(payload) {
    if (!io) return;

    const { feedbackId, summary, sentiment, priority, emotion } = payload;
    const eventPayload = {
        feedbackId,
        summary,
        sentiment,
        priority,
        emotion,
        timestamp: new Date().toISOString(),
    };

    // Kiểm tra có admin nào đang online không (Requirement 8.4)
    const adminRoom = io.sockets.adapter.rooms.get("admins");
    if (!adminRoom || adminRoom.size === 0) {
        console.log(`[WS] high_priority_feedback emitted but no admin online — feedbackId: ${feedbackId}`);
    }

    io.to("admins").emit("high_priority_feedback", eventPayload);
}

module.exports = { initSocket, getIO, emitNotification, emitAdminAlert, emitHighPriorityAlert };
