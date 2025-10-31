"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = void 0;
const supabase_1 = require("../config/supabase");
/**
 * Optional authentication middleware
 * Attaches user info if token is provided, but doesn't require it
 * Perfect for endpoints that work for both authenticated and anonymous users
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        // If no token, continue as anonymous
        if (!token) {
            next();
            return;
        }
        const supabase = (0, supabase_1.createClient)();
        // Try to verify the JWT token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            // Invalid token, but we don't fail - continue as anonymous
            console.warn('Invalid token provided, continuing as anonymous:', error?.message);
            next();
            return;
        }
        // Get user data from our database
        const { data: userData, error: dbError } = await supabase
            .from('users')
            .select('id, email, role')
            .eq('id', user.id)
            .single();
        if (!dbError && userData) {
            // Add user info to request object
            req.user = {
                id: userData.id,
                email: userData.email,
                role: userData.role
            };
        }
        next();
    }
    catch (error) {
        // Any error in auth, continue as anonymous
        console.warn('Optional auth error, continuing as anonymous:', error);
        next();
    }
};
exports.optionalAuth = optionalAuth;
