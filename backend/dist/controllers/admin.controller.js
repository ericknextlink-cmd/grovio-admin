"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_service_1 = require("../services/admin.service");
class AdminController {
    constructor() {
        /**
         * Admin login
         */
        this.login = async (req, res) => {
            try {
                const { username, password } = req.body;
                if (!username || !password) {
                    res.status(400).json({
                        success: false,
                        message: 'Username and password are required'
                    });
                    return;
                }
                const result = await this.adminService.login(username, password);
                if (!result.success) {
                    res.status(401).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
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
         * Admin logout
         */
        this.logout = async (req, res) => {
            try {
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
