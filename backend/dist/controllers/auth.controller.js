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
         * Initiate Google OAuth flow (returns redirect URL)
         * NOTE: This is for server-side OAuth initiation.
         * For client-side OAuth (recommended), the frontend should call supabase.auth.signInWithOAuth() directly.
         * This endpoint is kept for backward compatibility but may have issues with PKCE cookies.
         */
        this.initiateGoogleAuth = async (req, res) => {
            try {
                const redirectTo = req.query.redirectTo || '/dashboard';
                const result = await this.authService.initiateGoogleAuth(redirectTo, req, res);
                if (result.success && result.cookieName && result.cookieValue) {
                    const isProduction = process.env.NODE_ENV === 'production';
                    res.cookie(result.cookieName, result.cookieValue, {
                        httpOnly: true,
                        secure: true,
                        sameSite: 'none',
                        maxAge: 10 * 60 * 1000, // 10 minutes
                        path: '/',
                    });
                    const { cookieName, cookieValue, ...responseData } = result;
                    res.status(200).json(responseData);
                }
                else {
                    res.status(500).json(result);
                }
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
         */
        this.googleCallback = async (req, res) => {
            try {
                const code = req.query.code;
                const error = req.query.error;
                const errorDescription = req.query.error_description;
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
                const frontendOrigin = new URL(frontendUrl).origin;
                // Helper to build HTML response for popup flow
                const buildResponseHTML = (payload, success) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${success ? 'Authentication Success' : 'Authentication Error'}</title>
    <style>
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        margin: 0;
        padding: 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        color: #0f172a;
        background: #f8fafc;
      }
    </style>
  </head>
  <body>
    <p>${success ? 'Authentication successful. Closing window...' : 'Authentication failed. Closing window...'}</p>
    <script>
      (function () {
        const payload = ${JSON.stringify(payload)};
        const targetOrigin = ${JSON.stringify(frontendOrigin)};

        function notifyParent() {
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(
                {
                  type: 'grovio:google-auth',
                  success: ${success},
                  data: payload
                },
                targetOrigin
              );
            }
          } catch (err) {
            console.warn('Failed to notify opener:', err);
          }
        }

        notifyParent();

        // Attempt to close popup
        try {
          window.close();
        } catch (err) {
          console.warn('Unable to close window:', err);
        }

        // Fallback redirect
        setTimeout(() => {
          window.location.replace(${JSON.stringify(success
                    ? `${frontendUrl}${payload.redirectTo || '/dashboard'}`
                    : `${frontendUrl}/login?error=${encodeURIComponent(payload.error || 'unknown_error')}`)});
        }, 500);
      })();
    </script>
  </body>
</html>`;
                // Handle OAuth errors
                if (error) {
                    console.error('Google OAuth error:', error, errorDescription);
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                    res.setHeader('Pragma', 'no-cache');
                    res.setHeader('Expires', '0');
                    res.status(400).send(buildResponseHTML({
                        error,
                        errorDescription: errorDescription || 'OAuth callback with invalid state'
                    }, false));
                    return;
                }
                // Handle missing authorization code
                if (!code) {
                    console.error('Missing authorization code');
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                    res.setHeader('Pragma', 'no-cache');
                    res.setHeader('Expires', '0');
                    res.status(400).send(buildResponseHTML({
                        error: 'invalid_request',
                        errorDescription: 'Missing authorization code'
                    }, false));
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
                    console.log('OAuth callback successful, returning session to frontend');
                    // Return success response with session data for popup flow
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                    res.setHeader('Pragma', 'no-cache');
                    res.setHeader('Expires', '0');
                    res.status(200).send(buildResponseHTML({
                        session: result.session,
                        user: result.user,
                        redirectTo: result.redirectTo || '/dashboard'
                    }, true));
                }
                else {
                    console.error('OAuth callback failed:', result.errors);
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                    res.setHeader('Pragma', 'no-cache');
                    res.setHeader('Expires', '0');
                    res.status(400).send(buildResponseHTML({
                        error: 'authentication_failed',
                        errorDescription: result.message || 'Failed to process OAuth callback',
                        errors: result.errors
                    }, false));
                }
            }
            catch (error) {
                console.error('Google callback error:', error);
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
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
