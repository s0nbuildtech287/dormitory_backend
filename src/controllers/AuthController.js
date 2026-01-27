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
