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
     * Send OTP to email
     */
    async sendOtp(req, res, next) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ success: false, message: 'Email là bắt buộc!' });

            const otpStore = require('../untils/otpStore');
            const EmailService = require('../services/EmailService');

            const code = otpStore.set(email);
            await EmailService.sendOtp(email, code);

            res.json({ success: true, message: `Mã OTP đã được gửi đến ${email}` });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Verify OTP
     */
    async verifyOtp(req, res, next) {
        try {
            const { email, code } = req.body;
            if (!email || !code) return res.status(400).json({ success: false, message: 'Email và mã OTP là bắt buộc!' });

            const otpStore = require('../untils/otpStore');
            const isValid = otpStore.verify(email, code);

            if (!isValid) return res.status(400).json({ success: false, message: 'Mã OTP không đúng hoặc đã hết hạn!' });

            res.json({ success: true, message: 'Xác thực OTP thành công!' });
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
     * Forgot password - send OTP to email
     */
    async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ success: false, message: 'Email là bắt buộc!' });

            const UserDAO = require('../dao/UserDAO');
            const user = await UserDAO.findByEmail(email);
            if (!user) return res.status(404).json({ success: false, message: 'Email không tồn tại trong hệ thống!' });

            const otpStore = require('../untils/otpStore');
            const EmailService = require('../services/EmailService');

            const code = otpStore.set(email);
            await EmailService.sendOtp(email, code);

            res.json({ success: true, message: `Mã OTP đã được gửi đến ${email}` });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reset password - verify OTP then update password
     */
    async resetPassword(req, res, next) {
        try {
            const { email, code, newPassword } = req.body;
            if (!email || !code || !newPassword) {
                return res.status(400).json({ success: false, message: 'Email, mã OTP và mật khẩu mới là bắt buộc!' });
            }

            const otpStore = require('../untils/otpStore');
            const isValid = otpStore.verify(email, code);
            if (!isValid) return res.status(400).json({ success: false, message: 'Mã OTP không đúng hoặc đã hết hạn!' });

            const UserDAO = require('../dao/UserDAO');
            const bcrypt = require('bcryptjs');
            const user = await UserDAO.findByEmail(email);
            if (!user) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại!' });

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await UserDAO.update(user.id, { password: hashedPassword });

            const LogSystemDAO = require('../dao/LogSystemDAO');
            await LogSystemDAO.log(user.id, 'RESET_PASSWORD', 'users', user.id, null, { action: 'password_reset' }, req);

            res.json({ success: true, message: 'Đặt lại mật khẩu thành công!' });
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
