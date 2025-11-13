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
         */
        this.initiateGoogleAuth = async (req, res) => {
            try {
                const redirectTo = req.query.redirectTo || '/dashboard';
                const result = await this.authService.initiateGoogleAuth(redirectTo);
                if (result.success && result.cookieName && result.cookieValue) {
                    // Set cookie to store redirectTo path (works across OAuth redirect)
                    // Use SameSite=None with Secure in production for cross-domain support
                    // SameSite=Lax in development for localhost
                    const isProduction = process.env.NODE_ENV === 'production';
                    res.cookie(result.cookieName, result.cookieValue, {
                        httpOnly: true,
                        secure: isProduction, // Secure cookies required for SameSite=None
                        sameSite: isProduction ? 'none' : 'lax', // None for cross-domain, Lax for same-domain
                        maxAge: 10 * 60 * 1000, // 10 minutes
                        path: '/',
                    });
                    // Return response without cookie data (cookie is set in header)
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
         * Handle Google OAuth callback
         */
        this.googleCallback = async (req, res) => {
            try {
                const code = req.query.code;
                const error = req.query.error;
                const errorDescription = req.query.error_description;
                // Get redirectTo from cookie (set during OAuth initiation)
                // Fallback to /dashboard if cookie is not found
                let redirectTo = '/dashboard';
                const cookieName = 'grovio_oauth_redirect';
                const redirectCookie = req.cookies?.[cookieName];
                if (redirectCookie) {
                    try {
                        const decoded = Buffer.from(redirectCookie, 'base64url').toString('utf8');
                        const parsed = JSON.parse(decoded);
                        if (parsed?.redirectTo && typeof parsed.redirectTo === 'string') {
                            redirectTo = parsed.redirectTo;
                        }
                        // Clear the cookie after reading it
                        res.clearCookie(cookieName, { path: '/' });
                    }
                    catch (err) {
                        console.warn('Failed to decode redirect cookie:', err);
                        // Clear invalid cookie
                        res.clearCookie(cookieName, { path: '/' });
                    }
                }
                if (error) {
                    console.error('Google OAuth error:', error, errorDescription);
                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
                    const frontendOrigin = new URL(frontendUrl).origin;
                    // Send error response via postMessage for popup flow
                    const buildErrorResponse = (errorData) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Authentication Error</title>
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
    <p>Authentication failed. Closing window...</p>
    <script>
      (function () {
        const payload = {
          success: false,
          error: ${JSON.stringify(error)},
          errorDescription: ${JSON.stringify(errorDescription || 'OAuth callback with invalid state')}
        };
        const targetOrigin = ${JSON.stringify(frontendOrigin)};

        function notifyParent() {
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(
                {
                  type: 'grovio:google-auth',
                  success: false,
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
          window.location.replace(${JSON.stringify(`${frontendUrl}/login?error=${encodeURIComponent(error)}`)});
        }, 500);
      })();
    </script>
  </body>
</html>`;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.setHeader('Cache-Control', 'no-store');
                    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
                    res.status(400).send(buildErrorResponse({ error, errorDescription }));
                    return;
                }
                if (!code) {
                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
                    const frontendOrigin = new URL(frontendUrl).origin;
                    const buildErrorResponse = (message) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Authentication Error</title>
  </head>
  <body>
    <p>${message}</p>
    <script>
      (function () {
        const payload = {
          success: false,
          error: 'invalid_request',
          errorDescription: ${JSON.stringify(message)}
        };
        const targetOrigin = ${JSON.stringify(frontendOrigin)};

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: 'grovio:google-auth',
              success: false,
              data: payload
            },
            targetOrigin
          );
        }

        try {
          window.close();
        } catch (err) {
          setTimeout(() => {
            window.location.replace(${JSON.stringify(`${frontendUrl}/login?error=missing_code`)});
          }, 500);
        }
      })();
    </script>
  </body>
</html>`;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.status(400).send(buildErrorResponse('Missing authorization code'));
                    return;
                }
                const result = await this.authService.handleGoogleCallback(code);
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
                const frontendOrigin = new URL(frontendUrl).origin;
                // Use redirectTo from query params (passed in redirectTo URL)
                const redirectPath = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`;
                const buildHtmlResponse = (payload) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Signing you in…</title>
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
      .spinner {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 4px solid rgba(15, 23, 42, 0.15);
        border-top-color: #2563eb;
        animation: spin 1s ease-in-out infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div class="spinner" role="presentation"></div>
    <p>Completing sign-in…</p>
    <script>
      (function () {
        const payload = ${JSON.stringify(payload)};
        const targetOrigin = ${JSON.stringify(frontendOrigin)};
        const fallbackUrl = ${JSON.stringify(new URL(redirectPath || '/', frontendUrl).toString())};

        function notifyParent(success) {
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(
                {
                  type: 'grovio:google-auth',
                  success,
                  data: payload
                },
                targetOrigin
              );
            }
          } catch (err) {
            console.warn('Failed to notify opener:', err);
          }
        }

        notifyParent(payload.success === true);

        // Attempt to close popup if allowed
        try {
          window.close();
        } catch (err) {
          console.warn('Unable to close window programmatically:', err);
        }

        // As fallback, replace location so the user is not stuck on this page
        setTimeout(() => {
          window.location.replace(fallbackUrl);
        }, 500);
      })();
    </script>
  </body>
</html>`;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Cache-Control', 'no-store');
                res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
                res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
                if (result.success) {
                    const payload = {
                        success: true,
                        redirectTo: redirectPath,
                        accessToken: result.accessToken || null,
                        refreshToken: result.refreshToken || null,
                        user: result.user || null,
                        message: 'Google authentication successful'
                    };
                    res.status(200).send(buildHtmlResponse(payload));
                }
                else {
                    const payload = {
                        success: false,
                        redirectTo: '/',
                        error: result.message || 'Failed to complete Google authentication',
                        details: result.errors || []
                    };
                    res.status(200).send(buildHtmlResponse(payload));
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
