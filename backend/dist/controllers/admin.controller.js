"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_service_1 = require("../services/admin.service");
class AdminController {
    constructor() {
        /**
         * Admin login - accepts username or email
         */
        this.login = async (req, res) => {
            try {
                const { usernameOrEmail, password } = req.body;
                if (!usernameOrEmail || !password) {
                    res.status(400).json({
                        success: false,
                        message: 'Username/email and password are required'
                    });
                    return;
                }
                const result = await this.adminService.login(usernameOrEmail, password);
                if (!result.success) {
                    res.status(401).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                // Set token in cookie
                const cookieOptions = {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 24 * 60 * 60 * 1000, // 24 hours
                    path: '/',
                };
                res.cookie('admin_token', result.data.token, cookieOptions);
                res.json({
                    success: true,
                    message: 'Login successful',
                    data: result.data
                });
            }
            catch (error) {
                console.error('Admin login error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Get admin profile
         */
        this.getProfile = async (req, res) => {
            try {
                const adminId = req.adminId;
                const admin = await this.adminService.getAdminById(adminId);
                if (!admin) {
                    res.status(404).json({
                        success: false,
                        message: 'Admin not found'
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Admin profile retrieved successfully',
                    data: admin
                });
            }
            catch (error) {
                console.error('Get admin profile error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Update admin profile
         */
        this.updateProfile = async (req, res) => {
            try {
                const adminId = req.adminId;
                const updates = req.body;
                const result = await this.adminService.updateAdmin(adminId, updates);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Profile updated successfully',
                    data: result.data
                });
            }
            catch (error) {
                console.error('Update admin profile error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Change admin password
         */
        this.changePassword = async (req, res) => {
            try {
                const adminId = req.adminId;
                const { currentPassword, newPassword } = req.body;
                if (!currentPassword || !newPassword) {
                    res.status(400).json({
                        success: false,
                        message: 'Current password and new password are required'
                    });
                    return;
                }
                const result = await this.adminService.changePassword(adminId, currentPassword, newPassword);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Password changed successfully'
                });
            }
            catch (error) {
                console.error('Change password error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Refresh admin token
         */
        this.refreshToken = async (req, res) => {
            try {
                const adminId = req.adminId;
                const result = await this.adminService.refreshToken(adminId);
                if (!result.success) {
                    res.status(401).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                // Set token in cookie
                const cookieOptions = {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 24 * 60 * 60 * 1000, // 24 hours
                    path: '/',
                };
                res.cookie('admin_token', result.data.token, cookieOptions);
                res.json({
                    success: true,
                    message: 'Token refreshed successfully',
                    data: result.data
                });
            }
            catch (error) {
                console.error('Refresh token error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Admin logout
         */
        this.logout = async (req, res) => {
            try {
                // Clear cookie
                res.clearCookie('admin_token', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    path: '/',
                });
                // In a more complex system, you might want to blacklist the token
                res.json({
                    success: true,
                    message: 'Logged out successfully'
                });
            }
            catch (error) {
                console.error('Admin logout error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        this.adminService = new admin_service_1.AdminService();
    }
}
exports.AdminController = AdminController;
