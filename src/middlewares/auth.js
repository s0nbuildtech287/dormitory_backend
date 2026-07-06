const AuthService = require('../services/AuthService');

// Middleware xác thực token JWT của người dùng gửi lên
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Định dạng: Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Không tìm thấy token xác thực'
            });
        }

        const decoded = AuthService.verifyToken(token);
        req.user = decoded; // Lưu thông tin giải mã vào request để sử dụng ở các controller sau
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token không hợp lệ hoặc đã hết hạn'
        });
    }
};

// Middleware kiểm tra quyền quản trị viên (Admin/Super Admin/Staff)
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Yêu cầu đăng nhập tài khoản'
        });
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'STAFF') {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập chức năng này'
        });
    }

    next();
};

// Middleware kiểm tra quyền sinh viên
const requireStudent = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Yêu cầu đăng nhập tài khoản'
        });
    }

    if (req.user.role !== 'STUDENT') {
        return res.status(403).json({
            success: false,
            message: 'Chức năng này chỉ dành cho sinh viên'
        });
    }

    next();
};

module.exports = {
    authenticate,
    requireAdmin,
    requireStudent
};
