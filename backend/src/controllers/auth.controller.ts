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
   * Initiate Google OAuth flow (returns redirect URL)
   */
  initiateGoogleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      const redirectTo = req.query.redirectTo as string || '/dashboard'
      const result = await this.authService.initiateGoogleAuth(redirectTo)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(500).json(result)
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
   * Handle Google OAuth callback
   */
  googleCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const code = req.query.code as string
      const state = req.query.state as string
      const error = req.query.error as string

      if (error) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001'
        res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(error)}`)
        return
      }

      if (!code) {
        res.status(400).json({
          success: false,
          message: 'Missing authorization code',
          errors: ['No code provided in callback']
        } as ApiResponse)
        return
      }

      const result = await this.authService.handleGoogleCallback(code)

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001'
      const frontendOrigin = new URL(frontendUrl).origin

      const resolveRedirectPath = (): string => {
        if (!state) return '/'
        try {
          const decoded = Buffer.from(state, 'base64url').toString('utf8')
          const parsed = JSON.parse(decoded)
          if (parsed?.redirectTo && typeof parsed.redirectTo === 'string') {
            return parsed.redirectTo
          }
        } catch (err) {
          console.warn('Failed to decode Google OAuth state payload:', err)
        }
        return '/'
      }

      const redirectPath = resolveRedirectPath()

      const buildHtmlResponse = (payload: Record<string, unknown>) => `
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
</html>`

      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
      res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none')

      if (result.success) {
        const payload = {
          success: true,
          redirectTo: redirectPath,
          accessToken: result.accessToken || null,
          refreshToken: result.refreshToken || null,
          user: result.user || null,
          message: 'Google authentication successful'
        }

        res.status(200).send(buildHtmlResponse(payload))
      } else {
        const payload = {
          success: false,
          redirectTo: '/',
          error: result.message || 'Failed to complete Google authentication',
          details: result.errors || []
        }

        res.status(200).send(buildHtmlResponse(payload))
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
