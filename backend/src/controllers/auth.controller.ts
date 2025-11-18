import { Request, Response } from 'express'
import { AuthService } from '../services/auth.service'
import { UserService } from '../services/user.service'
import { ApiResponse } from '../types/api.types'
import { SignupRequest, SigninRequest, GoogleAuthRequest } from '../types/auth'

export class AuthController {
  private authService: AuthService
  private userService: UserService

  constructor() {
    this.authService = new AuthService()
    this.userService = new UserService()
  }

  /**
   * User signup with email and password
   */
  signup = async (req: Request, res: Response): Promise<void> => {
    try {
      const signupData: SignupRequest = req.body
      const result = await this.authService.signUp(signupData)

      if (result.success) {
        res.status(201).json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Signup controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong during signup']
      } as ApiResponse)
    }
  }

  /**
   * User signin with email and password
   */
  signin = async (req: Request, res: Response): Promise<void> => {
    try {
      const signinData: SigninRequest = req.body
      const result = await this.authService.signIn(signinData)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(401).json(result)
      }
    } catch (error) {
      console.error('Signin controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong during signin']
      } as ApiResponse)
    }
  }

  /**
   * Initiate Google OAuth flow
   * Option 1: Returns redirect URL (for AJAX requests)
   * Option 2: Redirects directly to Google (for navigation/popup requests)
   * 
   * If the request has Accept: text/html or is from a popup/navigation, redirect directly.
   * Otherwise, return JSON with the OAuth URL.
   */
  initiateGoogleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      const redirectTo = req.query.redirectTo as string || '/dashboard'
      const result = await this.authService.initiateGoogleAuth(redirectTo, req, res)

      if (!result.success || !result.url) {
        res.status(500).json(result)
        return
      }

      // Check if this is a navigation request (from popup/window.open) or AJAX request
      const acceptsHtml = req.headers.accept?.includes('text/html')
      const isNavigation = acceptsHtml || !req.headers['x-requested-with']

      if (isNavigation) {
        // For navigation requests: redirect directly to Google OAuth
        // This ensures cookies are set during navigation, making them available on callback
        console.log('Redirecting directly to Google OAuth (navigation request)')

        // Set redirect cookie
        if (result.cookieName && result.cookieValue) {
          const isProduction = process.env.NODE_ENV === 'production'
          res.cookie(result.cookieName, result.cookieValue, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 10 * 60 * 1000, // 10 minutes
            path: '/',
          })
        }

        // Redirect directly to Google OAuth URL
        res.redirect(result.url)
      } else {
        // For AJAX requests: return JSON with URL
        console.log('Returning OAuth URL (AJAX request)')

        if (result.cookieName && result.cookieValue) {
          const isProduction = process.env.NODE_ENV === 'production'
          res.cookie(result.cookieName, result.cookieValue, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 10 * 60 * 1000, // 10 minutes
            path: '/',
          })
        }

        const { cookieName, cookieValue, ...responseData } = result
        res.status(200).json(responseData)
      }
    } catch (error) {
      console.error('Initiate Google auth error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to initiate Google authentication']
      } as ApiResponse)
    }
  }

  /**
   * Handle OAuth session from frontend (client-side OAuth flow)
   * Frontend exchanges code for session client-side, then sends session here
   */
  handleOAuthSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { session } = req.body

      if (!session) {
        res.status(400).json({
          success: false,
          message: 'Session data is required',
          errors: ['Please provide session data from Supabase']
        } as ApiResponse)
        return
      }

      const result = await this.authService.handleGoogleCallbackSession(session)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Handle OAuth session error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while processing OAuth session']
      } as ApiResponse)
    }
  }

  /**
   * Handle Google OAuth callback (server-side SSR flow with PKCE)
   * Exchanges authorization code for session using PKCE code verifier from cookies
   */
  googleCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const code = req.query.code as string
      const error = req.query.error as string
      const errorDescription = req.query.error_description as string
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001'
      const frontendOrigin = new URL(frontendUrl).origin

      // Helper to build HTML response for popup flow
      const buildResponseHTML = (payload: any, success: boolean) => `
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
          window.location.replace(${JSON.stringify(
        success
          ? `${frontendUrl}${payload.redirectTo || '/dashboard'}`
          : `${frontendUrl}/login?error=${encodeURIComponent(payload.error || 'unknown_error')}`
      )});
        }, 500);
      })();
    </script>
  </body>
</html>`

      // Handle OAuth errors
      if (error) {
        console.error('Google OAuth error:', error, errorDescription)
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
        res.status(400).send(buildResponseHTML({
          error,
          errorDescription: errorDescription || 'OAuth callback with invalid state'
        }, false))
        return
      }

      // Handle missing authorization code
      if (!code) {
        console.error('Missing authorization code')
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
        res.status(400).send(buildResponseHTML({
          error: 'invalid_request',
          errorDescription: 'Missing authorization code'
        }, false))
        return
      }

      // Exchange code for session (server-side SSR flow with PKCE)
      console.log('Processing Google OAuth callback with code exchange...')
      const result = await this.authService.handleGoogleCallback(code, req, res)

      // Clear redirect cookie if it exists
      const cookieName = 'grovio_oauth_redirect'
      if (req.cookies?.[cookieName]) {
        res.clearCookie(cookieName, { path: '/' })
      }

      if (result.success && result.session) {
        console.log('OAuth callback successful, returning session to frontend')

        // Return success response with session data for popup flow
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
        res.status(200).send(buildResponseHTML({
          session: result.session,
          user: result.user,
          redirectTo: result.redirectTo || '/dashboard'
        }, true))
      } else {
        console.error('OAuth callback failed:', result.errors)
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
        res.status(400).send(buildResponseHTML({
          error: 'authentication_failed',
          errorDescription: result.message || 'Failed to process OAuth callback',
          errors: result.errors
        }, false))
      }
    } catch (error) {
      console.error('Google callback error:', error)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001'
      res.redirect(`${frontendUrl}/login?error=server_error`)
    }
  }

  /**
   * Google OAuth authentication (ID token method - legacy)
   */
  googleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      const googleData: GoogleAuthRequest = req.body
      const result = await this.authService.googleAuth(googleData)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(401).json(result)
      }
    } catch (error) {
      console.error('Google auth controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong during Google authentication']
      } as ApiResponse)
    }
  }

  /**
   * User signout
   */
  signout = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.signOut(req)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(500).json(result)
      }
    } catch (error) {
      console.error('Signout controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong during signout']
      } as ApiResponse)
    }
  }

  /**
   * Get current user profile
   */
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
          errors: ['Please sign in']
        } as ApiResponse)
        return
      }

      const result = await this.userService.getUserProfile(userId)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(404).json(result)
      }
    } catch (error) {
      console.error('Get profile controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while fetching profile']
      } as ApiResponse)
    }
  }

  /**
   * Update user profile
   */
  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
          errors: ['Please sign in']
        } as ApiResponse)
        return
      }

      const updateData = req.body
      const result = await this.userService.updateUserProfile(userId, updateData)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Update profile controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while updating profile']
      } as ApiResponse)
    }
  }

  /**
   * Refresh access token
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required',
          errors: ['Missing refresh token']
        } as ApiResponse)
        return
      }

      const result = await this.authService.refreshToken(refreshToken)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(401).json(result)
      }
    } catch (error) {
      console.error('Refresh token controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while refreshing token']
      } as ApiResponse)
    }
  }
}
