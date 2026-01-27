const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserDAO = require('../dao/UserDAO');
const LogSystemDAO = require('../dao/LogSystemDAO');

class AuthService {
    /**
     * Register new user
     */
    async register(userData, req = null) {
        try {
            // Check if email already exists
            const existingUser = await UserDAO.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('Email already registered');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // Create user
            const userId = `user-${Date.now()}`;
            const user = await UserDAO.create({
                id: userId,
                ...userData,
                password: hashedPassword
            });

            // Log action
            await LogSystemDAO.log(
                userId,
                'CREATE_USER',
                'users',
                userId,
                null,
                { email: user.email, role: user.role },
                req
            );

            // Remove password from response
            delete user.password;
            return user;
        } catch (error) {
            throw new Error(`Registration failed: ${error.message}`);
        }
    }

    /**
     * Login user
     */
    async login(email, password, req = null) {
        try {
            // Find user by email
            const user = await UserDAO.findByEmail(email);
            if (!user) {
                throw new Error('Invalid email or password');
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                throw new Error('Invalid email or password');
            }

            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE || '7d' }
            );

            // Log action
            await LogSystemDAO.log(
                user.id,
                'LOGIN',
                'users',
                user.id,
                null,
                { email: user.email },
                req
            );

            // Remove password from response
            delete user.password;

            return { user, token };
        } catch (error) {
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    /**
     * Change password
     */
    async changePassword(userId, oldPassword, newPassword, req = null) {
        try {
            const user = await UserDAO.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Verify old password
            const isValidPassword = await bcrypt.compare(oldPassword, user.password);
            if (!isValidPassword) {
                throw new Error('Invalid old password');
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update password
            await UserDAO.update(userId, { password: hashedPassword });

            // Log action
            await LogSystemDAO.log(
                userId,
                'CHANGE_PASSWORD',
                'users',
                userId,
                null,
                { action: 'password_changed' },
                req
            );

            return true;
        } catch (error) {
            throw new Error(`Change password failed: ${error.message}`);
        }
    }

    /**
     * Verify token
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
}

module.exports = new AuthService();
