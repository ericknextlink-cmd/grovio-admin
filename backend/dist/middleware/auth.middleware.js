"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUser = exports.requireAdmin = exports.authenticateToken = void 0;
const supabase_1 = require("../config/supabase");
/**
 * Middleware to authenticate user using Supabase JWT token
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required',
                errors: ['Missing authorization token']
            });
        }
        const supabase = (0, supabase_1.createClient)();
        // Verify the JWT token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token',
                errors: ['Authentication failed']
            });
        }
        // Get user data from our database
        const { data: userData, error: dbError } = await supabase
            .from('users')
            .select('id, email, role')
            .eq('id', user.id)
            .single();
        if (dbError || !userData) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
                errors: ['User profile not found']
            });
        }
        // Add user info to request object
        req.user = {
            id: userData.id,
            email: userData.email,
            role: userData.role
        };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            errors: ['Authentication service error']
        });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            errors: ['Please sign in']
        });
    }
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required',
            errors: ['Insufficient permissions']
        });
    }
    next();
};
exports.requireAdmin = requireAdmin;
/**
 * Middleware to check if user is customer or admin
 */
const requireUser = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            errors: ['Please sign in']
        });
    }
    if (!['customer', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'User access required',
            errors: ['Invalid user role']
        });
    }
    next();
};
exports.requireUser = requireUser;
