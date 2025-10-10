"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = require("../config/supabase");
class AdminService {
    constructor() {
        this.supabase = (0, supabase_1.createAdminClient)();
    }
    /**
     * Admin login
     */
    async login(username, password) {
        try {
            // Get admin user by username
            const { data: admin, error } = await this.supabase
                .from('admin_users')
                .select('*')
                .eq('username', username)
                .eq('is_active', true)
                .single();
            if (error || !admin) {
                return {
                    success: false,
                    message: 'Invalid credentials'
                };
            }
            // Verify password
            const isValidPassword = await bcryptjs_1.default.compare(password, admin.password_hash);
            if (!isValidPassword) {
                return {
                    success: false,
                    message: 'Invalid credentials'
                };
            }
            // Update last login
            await this.supabase
                .from('admin_users')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', admin.id);
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({
                adminId: admin.id,
                username: admin.username,
                role: admin.role
            }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '24h' });
            // Remove password hash from response
            const { password_hash, ...adminData } = admin;
            return {
                success: true,
                message: 'Login successful',
                data: {
                    admin: adminData,
                    token
                }
            };
        }
        catch (error) {
            console.error('Admin login error:', error);
            return {
                success: false,
                message: 'Login failed'
            };
        }
    }
    /**
     * Get admin by ID
     */
    async getAdminById(adminId) {
        try {
            const { data: admin, error } = await this.supabase
                .from('admin_users')
                .select('id, username, email, full_name, role, is_active, last_login_at, created_at, updated_at')
                .eq('id', adminId)
                .eq('is_active', true)
                .single();
            if (error || !admin) {
                return null;
            }
            return admin;
        }
        catch (error) {
            console.error('Get admin by ID error:', error);
            return null;
        }
    }
    /**
     * Update admin profile
     */
    async updateAdmin(adminId, updates) {
        try {
            const { data: admin, error } = await this.supabase
                .from('admin_users')
                .update(updates)
                .eq('id', adminId)
                .select('id, username, email, full_name, role, is_active, last_login_at, created_at, updated_at')
                .single();
            if (error || !admin) {
                return {
                    success: false,
                    message: 'Failed to update admin profile'
                };
            }
            return {
                success: true,
                message: 'Admin profile updated successfully',
                data: admin
            };
        }
        catch (error) {
            console.error('Update admin error:', error);
            return {
                success: false,
                message: 'Failed to update admin profile'
            };
        }
    }
    /**
     * Change admin password
     */
    async changePassword(adminId, currentPassword, newPassword) {
        try {
            // Get current admin data
            const { data: admin, error } = await this.supabase
                .from('admin_users')
                .select('password_hash')
                .eq('id', adminId)
                .single();
            if (error || !admin) {
                return {
                    success: false,
                    message: 'Admin not found'
                };
            }
            // Verify current password
            const isValidPassword = await bcryptjs_1.default.compare(currentPassword, admin.password_hash);
            if (!isValidPassword) {
                return {
                    success: false,
                    message: 'Current password is incorrect'
                };
            }
            // Hash new password
            const saltRounds = 12;
            const newPasswordHash = await bcryptjs_1.default.hash(newPassword, saltRounds);
            // Update password
            const { error: updateError } = await this.supabase
                .from('admin_users')
                .update({ password_hash: newPasswordHash })
                .eq('id', adminId);
            if (updateError) {
                return {
                    success: false,
                    message: 'Failed to update password'
                };
            }
            return {
                success: true,
                message: 'Password updated successfully'
            };
        }
        catch (error) {
            console.error('Change password error:', error);
            return {
                success: false,
                message: 'Failed to update password'
            };
        }
    }
    /**
     * Verify admin token
     */
    verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret');
            return {
                adminId: decoded.adminId,
                username: decoded.username,
                role: decoded.role
            };
        }
        catch (error) {
            return null;
        }
    }
}
exports.AdminService = AdminService;
