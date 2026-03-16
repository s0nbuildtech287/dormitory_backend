const AuthService = require('../services/AuthService');

class AuthController {
    /**
     * Register new user
     */
    async register(req, res, next) {
        try {
            const user = await AuthService.register(req.body, req);
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: user
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Login user
     */
    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            const result = await AuthService.login(email, password, req);
            res.json({
                success: true,
                message: 'Login successful',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get current user info
     */
    async getMe(req, res, next) {
        try {
            const UserDAO = require('../dao/UserDAO');
            const user = await UserDAO.findById(req.user.userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            delete user.password;
            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create admin account (superadmin only)
     */
    async createAdmin(req, res, next) {
        try {
            const { email, full_name } = req.body;

            // Chỉ buixu4ns0n@gmail.com mới được tạo
            if (req.user.email !== 'buixu4ns0n@gmail.com') {
                return res.status(403).json({ success: false, message: 'Không có quyền thực hiện thao tác này!' });
            }

            if (!email || !full_name) {
                return res.status(400).json({ success: false, message: 'Email và họ tên là bắt buộc!' });
            }

            const UserDAO = require('../dao/UserDAO');
            const existing = await UserDAO.findByEmail(email);
            if (existing) {
                return res.status(400).json({ success: false, message: 'Email đã tồn tại!' });
            }

            const userId = `admin-${Date.now()}`;
            const user = await UserDAO.create({
                id: userId,
                email,
                password: '123',
                full_name,
                role: 'ADMIN',
                is_active: true,
            });

            delete user.password;
            res.status(201).json({ success: true, message: `Tạo tài khoản ${email} thành công!`, data: user });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Change password
     */
    async changePassword(req, res, next) {
        try {
            const { oldPassword, newPassword } = req.body;

            if (!oldPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Old and new passwords are required'
                });
            }

            await AuthService.changePassword(req.user.userId, oldPassword, newPassword, req);
            res.json({
                success: true,
                message: 'Password changed successfully'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();
