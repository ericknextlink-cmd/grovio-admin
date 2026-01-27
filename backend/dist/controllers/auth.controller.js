"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const user_service_1 = require("../services/user.service");
class AuthController {
    constructor() {
        /**
         * User signup with email and password
         */
        this.signup = async (req, res) => {
            try {
                const signupData = req.body;
                const result = await this.authService.signUp(signupData);
                if (result.success) {
                    res.status(201).json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Signup controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong during signup']
                });
            }
        };
        /**
         * User signin with email and password
         */
        this.signin = async (req, res) => {
            try {
                const signinData = req.body;
                const result = await this.authService.signIn(signinData);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(401).json(result);
                }
            }
            catch (error) {
                console.error('Signin controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong during signin']
                });
            }
        };
        /**
         * Initiate Google OAuth flow
         * Redirects directly to Google
         */
        this.initiateGoogleAuth = async (req, res) => {
            try {
                const redirectTo = req.query.redirectTo || '/dashboard';
                const result = await this.authService.initiateGoogleAuth(redirectTo, req, res);
                if (!result.success || !result.url) {
                    res.status(500).json(result);
                    return;
                }
                console.log('Redirecting to Google OAuth');
                // Set redirect cookie if provided
                if (result.cookieName && result.cookieValue) {
                    const isProduction = process.env.NODE_ENV === 'production';
                    res.cookie(result.cookieName, result.cookieValue, {
                        httpOnly: true,
                        secure: isProduction,
                        sameSite: isProduction ? 'none' : 'lax',
                        maxAge: 10 * 60 * 1000, // 10 minutes
                        path: '/',
                    });
                }
                // Redirect directly to Google OAuth URL
                res.redirect(result.url);
            }
            catch (error) {
                console.error('Initiate Google auth error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Failed to initiate Google authentication']
                });
            }
        };
        /**
         * Handle OAuth session from frontend (client-side OAuth flow)
         * Frontend exchanges code for session client-side, then sends session here
         */
        this.handleOAuthSession = async (req, res) => {
            try {
                const { session } = req.body;
                if (!session) {
                    res.status(400).json({
                        success: false,
                        message: 'Session data is required',
                        errors: ['Please provide session data from Supabase']
                    });
                    return;
                }
                const result = await this.authService.handleGoogleCallbackSession(session);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Handle OAuth session error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while processing OAuth session']
                });
            }
        };
        /**
         * Handle Google OAuth callback (server-side SSR flow with PKCE)
         * Exchanges authorization code for session using PKCE code verifier from cookies
         * Redirects to frontend with session cookies set
         */
        this.googleCallback = async (req, res) => {
            try {
                const code = req.query.code;
                const error = req.query.error;
                const errorDescription = req.query.error_description;
                // Determine frontend URL
                // Use FRONTEND_URL env var, or referer, or default to localhost:3000
                let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                // Clean up trailing slash
                if (frontendUrl.endsWith('/')) {
                    frontendUrl = frontendUrl.slice(0, -1);
                }
                // Handle OAuth errors
                if (error) {
                    console.error('Google OAuth error:', error, errorDescription);
                    res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorDescription || error)}`);
                    return;
                }
                // Handle missing authorization code
                if (!code) {
                    console.error('Missing authorization code');
                    res.redirect(`${frontendUrl}/login?error=missing_code`);
                    return;
                }
                // Exchange code for session (server-side SSR flow with PKCE)
                console.log('Processing Google OAuth callback with code exchange...');
                const result = await this.authService.handleGoogleCallback(code, req, res);
                // Clear redirect cookie if it exists
                const cookieName = 'grovio_oauth_redirect';
                if (req.cookies?.[cookieName]) {
                    res.clearCookie(cookieName, { path: '/' });
                }
                if (result.success && result.session) {
                    console.log('OAuth callback successful, redirecting to frontend');
                    // Redirect to the stored redirect path or dashboard
                    const redirectPath = result.redirectTo || '/dashboard';
                    // Ensure path starts with /
                    const safePath = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
                    res.redirect(`${frontendUrl}${safePath}`);
                }
                else {
                    console.error('OAuth callback failed:', result.errors);
                    res.redirect(`${frontendUrl}/login?error=auth_failed&message=${encodeURIComponent(result.message || 'Authentication failed')}`);
                }
            }
            catch (error) {
                console.error('Google callback error:', error);
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                res.redirect(`${frontendUrl}/login?error=server_error`);
            }
        };
        /**
         * Google OAuth authentication (ID token method - legacy)
         */
        this.googleAuth = async (req, res) => {
            try {
                const googleData = req.body;
                const result = await this.authService.googleAuth(googleData);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(401).json(result);
                }
            }
            catch (error) {
                console.error('Google auth controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong during Google authentication']
                });
            }
        };
        /**
         * User signout
         */
        this.signout = async (req, res) => {
            try {
                const result = await this.authService.signOut(req);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(500).json(result);
                }
            }
            catch (error) {
                console.error('Signout controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong during signout']
                });
            }
        };
        /**
         * Get current user profile
         */
        this.getProfile = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Not authenticated',
                        errors: ['Please sign in']
                    });
                    return;
                }
                const result = await this.userService.getUserProfile(userId);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(404).json(result);
                }
            }
            catch (error) {
                console.error('Get profile controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while fetching profile']
                });
            }
        };
        /**
         * Update user profile
         */
        this.updateProfile = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Not authenticated',
                        errors: ['Please sign in']
                    });
                    return;
                }
                const updateData = req.body;
                const result = await this.userService.updateUserProfile(userId, updateData);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Update profile controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while updating profile']
                });
            }
        };
        /**
         * Refresh access token
         */
        this.refreshToken = async (req, res) => {
            try {
                const { refreshToken } = req.body;
                if (!refreshToken) {
                    res.status(400).json({
                        success: false,
                        message: 'Refresh token is required',
                        errors: ['Missing refresh token']
                    });
                    return;
                }
                const result = await this.authService.refreshToken(refreshToken);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(401).json(result);
                }
            }
            catch (error) {
                console.error('Refresh token controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while refreshing token']
                });
            }
        };
        this.authService = new auth_service_1.AuthService();
        this.userService = new user_service_1.UserService();
    }
}
exports.AuthController = AuthController;
