"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = exports.authenticateAdmin = void 0;
const admin_service_1 = require("../services/admin.service");
/**
 * Middleware to authenticate admin requests
 */
const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                message: 'Access token required'
            });
            return;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const adminService = new admin_service_1.AdminService();
        const decoded = adminService.verifyToken(token);
        if (!decoded) {
            res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
            return;
        }
        // Verify admin still exists and is active
        const admin = await adminService.getAdminById(decoded.adminId);
        if (!admin || !admin.is_active) {
            res.status(401).json({
                success: false,
                message: 'Admin account not found or inactive'
            });
            return;
        }
        // Add admin info to request object
        ;
        req.adminId = decoded.adminId;
        req.adminUsername = decoded.username;
        req.adminRole = decoded.role;
        next();
    }
    catch (error) {
        console.error('Admin authentication error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};
exports.authenticateAdmin = authenticateAdmin;
/**
 * Middleware to check if admin has super admin role
 */
const requireSuperAdmin = (req, res, next) => {
    const adminRole = req.adminRole;
    if (adminRole !== 'super_admin') {
        res.status(403).json({
            success: false,
            message: 'Super admin access required'
        });
        return;
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
