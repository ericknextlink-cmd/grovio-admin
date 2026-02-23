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
     * Admin login - accepts username or email
     */
    async login(usernameOrEmail, password) {
        try {
            // Determine if input is email or username
            const isEmail = usernameOrEmail.includes('@');
            // Get admin user by username or email
            const query = this.supabase
                .from('admin_users')
                .select('*')
                .eq('is_active', true);
            if (isEmail) {
                query.eq('email', usernameOrEmail.toLowerCase().trim());
            }
            else {
                query.eq('username', usernameOrEmail.trim());
            }
            const { data: admin, error } = await query.single();
            if (error || !admin) {
                return {
                    success: false,
                    message: 'Invalid username/email or password'
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
            const { password_hash: _pw, ...adminData } = admin;
            void _pw;
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
        catch {
            return null;
        }
    }
    /**
     * Refresh admin token - generates a new token for an existing valid token
     */
    async refreshToken(adminId) {
        try {
            const admin = await this.getAdminById(adminId);
            if (!admin || !admin.is_active) {
                return {
                    success: false,
                    message: 'Admin account not found or inactive'
                };
            }
            // Generate new JWT token
            const token = jsonwebtoken_1.default.sign({
                adminId: admin.id,
                username: admin.username,
                role: admin.role
            }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '24h' });
            return {
                success: true,
                message: 'Token refreshed successfully',
                data: {
                    token,
                    admin
                }
            };
        }
        catch (error) {
            console.error('Refresh token error:', error);
            return {
                success: false,
                message: 'Failed to refresh token'
            };
        }
    }
}
exports.AdminService = AdminService;
