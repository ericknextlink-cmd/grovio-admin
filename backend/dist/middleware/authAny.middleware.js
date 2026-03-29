"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateAdminOrUser = authenticateAdminOrUser;
const auth_middleware_1 = require("./auth.middleware");
const admin_service_1 = require("../services/admin.service");
/**
 * Authenticate either:
 * - Admin JWT (Bearer or admin_token cookie), OR
 * - User Supabase token/session (Bearer or cookies)
 *
 * Useful for endpoints shared between admin panel and user app.
 */
async function authenticateAdminOrUser(req, res, next) {
    // Try admin auth first if an admin token is present.
    try {
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        if (!token && req.cookies?.admin_token) {
            token = req.cookies.admin_token;
        }
        if (token) {
            const adminService = new admin_service_1.AdminService();
            const decoded = adminService.verifyToken(token);
            if (decoded) {
                const admin = await adminService.getAdminById(decoded.adminId);
                if (admin && admin.is_active) {
                    ;
                    req.adminId = decoded.adminId;
                    req.adminUsername = decoded.username;
                    req.adminRole = decoded.role;
                    next();
                    return;
                }
            }
        }
    }
    catch {
        // Ignore admin auth errors and fall back to user auth.
    }
    // Fall back to user auth.
    await (0, auth_middleware_1.authenticateToken)(req, res, next);
}
